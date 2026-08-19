import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * build_glossary — extract a "do not translate" glossary from a
 * corpus the operator hands us (or from the brand bible if no corpus
 * is supplied). Returns categorized terms with a short rationale for
 * each, plus a recommendedDefault flag (true if a market translation
 * is unwise; false if the term is generally safe to localize).
 *
 * The Translator role uses this on the day a new brand is onboarded;
 * the resulting glossary feeds `translate_text`'s `glossaryOverrides`
 * field on every subsequent call.
 */

const MODEL = "gpt-4o-mini";

const CATEGORIES = [
  "product_name",
  "brand_name",
  "trademark",
  "technical_jargon",
  "internal_codename",
  "acronym",
  "regulatory_term",
  "other",
] as const;

const MIN_CORPUS_LEN = 40;
const MAX_CORPUS_LEN = 8000;
const MIN_TERMS = 1;
const MAX_TERMS = 50;

export const buildGlossaryTool: Tool = {
  name: "build_glossary",
  description:
    "Extract a 'do not translate' glossary (product names, brand terms, trademarks, technical jargon) from operator-supplied corpus and/or the Brand Bible. Use this when onboarding a new brand or refreshing the existing glossary.",
  parameters: {
    type: "object",
    properties: {
      corpus: {
        type: "string",
        description:
          "Operator-supplied text to scan for glossary candidates. Optional — when omitted the tool reads from the Brand Bible only.",
      },
      brandBibleQuery: {
        type: "string",
        description:
          "Optional retrieval hint to find relevant Brand Bible chunks (e.g., 'product names', 'compliance terms').",
      },
      maxTerms: {
        type: "integer",
        description: "Max glossary terms returned. Default 25, capped at 50.",
        minimum: MIN_TERMS,
        maximum: MAX_TERMS,
      },
    },
    required: [],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const corpus = args.corpus ? String(args.corpus) : "";
    const brandBibleQuery = args.brandBibleQuery
      ? String(args.brandBibleQuery).slice(0, 300)
      : "product names brand terms";
    const maxTerms = Math.max(
      MIN_TERMS,
      Math.min(MAX_TERMS, Number(args.maxTerms ?? 25)),
    );

    if (corpus.length > 0 && corpus.length < MIN_CORPUS_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `corpus too short (need ≥${MIN_CORPUS_LEN} chars when supplied).`,
      };
    }
    if (corpus.length > MAX_CORPUS_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `corpus too long (max ${MAX_CORPUS_LEN} chars).`,
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: brandBibleQuery,
      k: 5,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    if (corpus.length === 0 && hits.length === 0) {
      return {
        ok: false,
        refused: true,
        reason:
          "Nothing to extract from — supply `corpus` or upload Brand Bible content first.",
      };
    }

    const systemPrompt = [
      "You are building a 'do not translate' glossary for a localization team.",
      "Output STRICT JSON: { terms: [{ term, category, rationale, recommendedDefault }] }.",
      `terms: 1-${maxTerms} entries. Most-important first.`,
      "term: the literal string that should appear verbatim in translations (case-sensitive).",
      `category: one of: ${CATEGORIES.join(", ")}.`,
      "rationale: ≤20 words — why this term should stay in the source language.",
      "recommendedDefault: true if a market translation would harm brand / clarity; false if some markets may want to localize.",
      "Skip generic words. Prefer terms with strong brand or technical specificity.",
      "Brand-bible context:",
      bbBlock,
    ].join("\n");

    const userContent = corpus
      ? `Corpus:\n${corpus}`
      : "(No operator corpus supplied — use Brand Bible context above.)";

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 1500,
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

      const rawTerms = Array.isArray(parsed.terms)
        ? (parsed.terms as Array<Record<string, unknown>>)
        : [];
      const terms = rawTerms
        .map((t) => ({
          term: typeof t.term === "string" ? t.term : "",
          category:
            typeof t.category === "string" &&
            (CATEGORIES as readonly string[]).includes(t.category as string)
              ? (t.category as string)
              : "other",
          rationale: typeof t.rationale === "string" ? t.rationale : "",
          recommendedDefault: t.recommendedDefault !== false,
        }))
        .filter((t) => t.term.length > 0)
        .slice(0, maxTerms);

      await logSecurityEvent({
        kind: "translator.glossary.built",
        tenantId: ctx.tenantId,
        payload: {
          subject: "translator.glossary.built",
          termsCount: terms.length,
          corpusLen: corpus.length,
          brandBibleHits: hits.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          termsCount: terms.length,
          terms,
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Glossary build failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
