import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * translate_text — translate a snippet from a source language to a
 * target language while preserving (a) brand-bible glossary terms,
 * (b) market-appropriate formality (Sie/du, vous/tu, sen/siz).
 *
 * The glossary is sourced from two places, merged:
 *   - operator-supplied `glossaryOverrides` (highest priority)
 *   - top brand-bible chunks for the source text (auto-injected)
 *
 * The model gets explicit instruction to leave glossary terms exactly
 * as-written and to apply the requested formality. We post-process
 * the output by checking that every glossary term appears in the
 * translation — if any are missing we surface them as `warnings`.
 */

const MODEL = "gpt-4o-mini";
const TARGET_LANGS = [
  "tr", "de", "fr", "es", "it", "pt", "ar", "zh", "ja", "ko", "ru", "pl", "nl",
  "en", "uk", "th", "hi", "no", "fi", "ms", "sv", "he", "da",
] as const;
const SOURCE_LANGS = [
  "en", "tr", "de", "fr", "es", "it", "pt", "ar", "zh", "ja", "ko", "ru",
  "pl", "nl", "uk", "th", "hi", "no", "fi", "ms", "sv", "he", "da",
] as const;
const FORMALITY_MODES = ["formal", "informal", "auto"] as const;
const MIN_TEXT_LEN = 2;
const MAX_TEXT_LEN = 6000;

export const translateTextTool: Tool = {
  name: "translate_text",
  description:
    "Translate text from source to target language while preserving brand glossary terms verbatim and applying market-appropriate formality. ALWAYS use this BEFORE answering a translation request — direct paraphrasing in chat is not allowed.",
  parameters: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "Source text. ≤6000 chars. For longer docs, split into chunks.",
      },
      sourceLang: {
        type: "string",
        enum: SOURCE_LANGS,
        description: "2-letter source code.",
      },
      targetLang: {
        type: "string",
        enum: TARGET_LANGS,
        description: "2-letter target code.",
      },
      formality: {
        type: "string",
        enum: FORMALITY_MODES,
        description:
          "'formal' = Sie/vous/siz, 'informal' = du/tu/sen, 'auto' = pick the market default. Default 'auto'.",
      },
      glossaryOverrides: {
        type: "array",
        description:
          "Operator-supplied terms that must appear in the output verbatim (case-sensitive). Each ≤80 chars.",
        items: { type: "string" },
      },
    },
    required: ["text", "sourceLang", "targetLang"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const text = String(args.text);
    const sourceLang = String(args.sourceLang).toLowerCase();
    const targetLang = String(args.targetLang).toLowerCase();
    const formality =
      ((args.formality as string | undefined) ?? "auto").toLowerCase();
    const glossaryOverrides = Array.isArray(args.glossaryOverrides)
      ? (args.glossaryOverrides as string[])
          .filter((s) => typeof s === "string" && s.length > 0 && s.length <= 80)
      : [];

    if (!(SOURCE_LANGS as readonly string[]).includes(sourceLang)) {
      return {
        ok: false,
        refused: true,
        reason: `sourceLang must be one of: ${SOURCE_LANGS.join(", ")}`,
      };
    }
    if (!(TARGET_LANGS as readonly string[]).includes(targetLang)) {
      return {
        ok: false,
        refused: true,
        reason: `targetLang must be one of: ${TARGET_LANGS.join(", ")}`,
      };
    }
    if (sourceLang === targetLang) {
      return {
        ok: false,
        refused: true,
        reason: "sourceLang and targetLang must differ.",
      };
    }
    if (!(FORMALITY_MODES as readonly string[]).includes(formality)) {
      return {
        ok: false,
        refused: true,
        reason: `formality must be one of: ${FORMALITY_MODES.join(", ")}`,
      };
    }
    if (text.trim().length < MIN_TEXT_LEN) {
      return { ok: false, refused: true, reason: "text too short to translate." };
    }
    if (text.length > MAX_TEXT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `text too long (max ${MAX_TEXT_LEN} chars).`,
      };
    }

    // Brand Bible: pull a few chunks and try to extract candidate
    // glossary terms (brand / product names). We just hand the chunks
    // to the model — extraction is its job; we don't need to be
    // clever upstream.
    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: text.slice(0, 400),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const glossaryClause =
      glossaryOverrides.length > 0
        ? `Operator-supplied glossary — keep these EXACTLY as written, do not translate or change case:\n${glossaryOverrides.map((t) => `  - ${t}`).join("\n")}`
        : "No operator-supplied glossary.";

    const formalityClause =
      formality === "formal"
        ? "Use the formal register (Sie / vous / siz / lei)."
        : formality === "informal"
          ? "Use the informal register (du / tu / sen / tu)."
          : "Apply the market-default register (German formal Sie; Turkish informal sen; French formal vous; Spanish/Italian informal tu; English neutral).";

    const systemPrompt = [
      `You are a professional translator from ${sourceLang} to ${targetLang}.`,
      "Output STRICT JSON: { translatedText, formalityApplied, preservedTerms, warnings }.",
      "translatedText: the translation. No commentary; just the rendered target-language text.",
      "formalityApplied: 'formal' | 'informal' (which register you ended up using).",
      "preservedTerms: array of glossary terms you kept verbatim in the translation.",
      "warnings: 0-3 short notes about cultural or terminology gotchas the operator should review.",
      glossaryClause,
      formalityClause,
      "Brand-bible context (extract terms that should NOT be translated — product names, trademarks, technical jargon):",
      bbBlock,
    ].join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        max_tokens: Math.min(2400, Math.max(400, Math.ceil(text.length * 1.5))),
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      await recordAiUsage({
        tenantId: ctx.tenantId,
        workerId: ctx.workerId,
        conversationId: ctx.conversationId,
        provider: "openai",
        kind: "chat",
        model: MODEL,
        promptTokens: res.usage?.prompt_tokens ?? 0,
        completionTokens: res.usage?.completion_tokens ?? 0,
        latencyMs: Date.now() - t0,
      });

      const raw = res.choices[0]?.message?.content ?? "{}";
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return { ok: false, refused: true, reason: "Model returned invalid JSON." };
      }

      const translatedText =
        typeof parsed.translatedText === "string"
          ? (parsed.translatedText as string)
          : "";
      const preservedTerms = Array.isArray(parsed.preservedTerms)
        ? (parsed.preservedTerms as string[])
        : [];

      // Post-check: every operator-supplied glossary term should
      // appear in the output. Surface missing ones as warnings.
      const missingGlossary = glossaryOverrides.filter(
        (t) => !translatedText.includes(t),
      );
      const warnings = Array.isArray(parsed.warnings)
        ? (parsed.warnings as string[])
        : [];
      if (missingGlossary.length > 0) {
        warnings.push(
          `Glossary terms missing from translation: ${missingGlossary.join(", ")}`,
        );
      }

      await logSecurityEvent({
        kind: "translation.created",
        tenantId: ctx.tenantId,
        payload: {
          subject: "translation.created",
          sourceLang,
          targetLang,
          formality,
          srcLen: text.length,
          tgtLen: translatedText.length,
          missingGlossaryCount: missingGlossary.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          sourceLang,
          targetLang,
          formality,
          formalityApplied:
            typeof parsed.formalityApplied === "string"
              ? parsed.formalityApplied
              : formality === "auto"
                ? "auto"
                : formality,
          translatedText,
          preservedTerms,
          warnings,
          missingGlossary,
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Translation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
