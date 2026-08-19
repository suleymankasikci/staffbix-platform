import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * draft_press_release — produce a structured press release draft
 * (headline, subhead, dateline, body paragraphs, boilerplate, contact).
 *
 * Hard rules baked into the system prompt:
 *   - NEVER invent direct quotes from the operator or named execs.
 *     If a quote is needed, the body uses `[QUOTE FROM ...]` placeholders.
 *   - NEVER make comparative claims about competitors.
 *   - ALWAYS include a one-line company description (boilerplate) at
 *     the foot.
 *
 * PR Manager defaults to "Approval required" so the draft is staged
 * for the operator before any send. The tool only RECORDS the draft;
 * distribution to wire services / journalists happens in a later
 * sprint (separate send_pitch tool).
 */

const MODEL = "gpt-4o-mini";

const RELEASE_KINDS = [
  "product_launch",
  "funding_round",
  "executive_hire",
  "partnership",
  "milestone",
  "expansion",
  "rebrand",
  "other",
] as const;

const MIN_PROMPT_LEN = 30;
const MAX_PROMPT_LEN = 4000;

export const draftPressReleaseTool: Tool = {
  name: "draft_press_release",
  description:
    "Generate a structured press release draft (headline, subhead, dateline, body, boilerplate, contact). NEVER invents quotes from the operator or any named person — quote placeholders are inserted for the operator to fill. NEVER makes negative comparative claims about competitors. The draft is staged for operator review; this tool does NOT distribute.",
  parameters: {
    type: "object",
    properties: {
      releaseKind: { type: "string", enum: RELEASE_KINDS },
      summary: {
        type: "string",
        description:
          "What is the release about? 1-3 sentences with the key facts (what / who / when / why-now).",
      },
      cityIso: {
        type: "string",
        description:
          "City + state/country for the dateline (e.g., 'San Francisco, CA').",
      },
      datelineDateIso: {
        type: "string",
        description: "ISO YYYY-MM-DD date for the dateline. Default: today.",
      },
      includeQuotePlaceholders: {
        type: "array",
        description:
          "Names of people who should appear as `[QUOTE FROM <name>, <title>]` placeholders. Operator fills the quotes.",
        items: { type: "string" },
      },
      embargoIso: {
        type: "string",
        description:
          "Optional ISO 8601 embargo timestamp (UTC). When set, a clear 'EMBARGOED UNTIL …' line is prepended.",
      },
    },
    required: ["releaseKind", "summary", "cityIso"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const releaseKind = String(args.releaseKind);
    const summary = String(args.summary).trim();
    const cityIso = String(args.cityIso).trim();
    const datelineDateIso = args.datelineDateIso
      ? String(args.datelineDateIso).trim()
      : new Date().toISOString().slice(0, 10);
    const includeQuotePlaceholders = Array.isArray(args.includeQuotePlaceholders)
      ? (args.includeQuotePlaceholders as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 6)
      : [];
    const embargoIso = args.embargoIso ? String(args.embargoIso).trim() : "";

    if (!(RELEASE_KINDS as readonly string[]).includes(releaseKind)) {
      return {
        ok: false,
        refused: true,
        reason: `releaseKind must be one of: ${RELEASE_KINDS.join(", ")}`,
      };
    }
    if (summary.length < MIN_PROMPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `summary too short (need ≥${MIN_PROMPT_LEN} chars).`,
      };
    }
    if (summary.length > MAX_PROMPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `summary too long (max ${MAX_PROMPT_LEN} chars).`,
      };
    }
    if (cityIso.length < 3) {
      return { ok: false, refused: true, reason: "cityIso too short." };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datelineDateIso)) {
      return {
        ok: false,
        refused: true,
        reason: "datelineDateIso must be YYYY-MM-DD.",
      };
    }
    if (embargoIso && !Number.isFinite(Date.parse(embargoIso))) {
      return {
        ok: false,
        refused: true,
        reason: "embargoIso is not a valid ISO 8601 timestamp.",
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `boilerplate company description ${releaseKind}`,
      k: 4,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches — boilerplate must be a placeholder)";

    const quoteInstruction =
      includeQuotePlaceholders.length > 0
        ? `MANDATORY: insert a placeholder for EACH person below as its own bodyParagraph entry (a paragraph that contains ONLY the placeholder string). Format EXACTLY: '[QUOTE FROM <Name>, <Title TBD>]'. Do not paraphrase or omit. Do not invent the quote text.\nPeople:\n${includeQuotePlaceholders.map((n) => `  - ${n}`).join("\n")}`
        : "No quote placeholders required.";

    const systemPrompt = [
      "You are drafting a press release for the operator's company.",
      "Output STRICT JSON: { headline, subhead, dateline, bodyParagraphs, boilerplate, contactBlock, openFields }.",
      "headline: ≤14 words.",
      "subhead: ≤25 words.",
      "dateline: 'CITY — Month DD, YYYY —' format.",
      "bodyParagraphs: 4-6 strings, each one paragraph (≤80 words).",
      "boilerplate: 1 paragraph ≤80 words about the company. Pull from Brand Bible; if missing, use '[BOILERPLATE — confirm with operator]'.",
      "contactBlock: 'Media Contact:\\n[Name]\\n[Title]\\n[Email]\\n[Phone]' — placeholders unless explicit in Brand Bible.",
      "openFields: 1-4 strings — placeholders the operator must fill before sending.",
      "ABSOLUTE RULES:",
      "  - NEVER invent quotes from any named person.",
      "  - NEVER make negative comparative claims about competitors.",
      "  - NEVER guess at numbers (revenue, customer counts, growth rates) — use '[METRIC — confirm with operator]' instead.",
      quoteInstruction,
      embargoIso
        ? `Prepend an 'EMBARGOED UNTIL ${embargoIso}' line at the top of bodyParagraphs[0].`
        : "No embargo — do not include an embargo line.",
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const userContent = [
      `releaseKind: ${releaseKind}`,
      `cityIso: ${cityIso}`,
      `datelineDateIso: ${datelineDateIso}`,
      "",
      "Summary:",
      summary,
    ].join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 1400,
        temperature: 0.3,
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

      await logSecurityEvent({
        kind: "pr.release.drafted",
        tenantId: ctx.tenantId,
        payload: {
          subject: "pr.release.drafted",
          releaseKind,
          cityIso,
          datelineDateIso,
          embargoIso: embargoIso || null,
          quotePlaceholderCount: includeQuotePlaceholders.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          releaseKind,
          headline: typeof parsed.headline === "string" ? parsed.headline : "",
          subhead: typeof parsed.subhead === "string" ? parsed.subhead : "",
          dateline: typeof parsed.dateline === "string" ? parsed.dateline : "",
          bodyParagraphs: Array.isArray(parsed.bodyParagraphs)
            ? (parsed.bodyParagraphs as string[])
            : [],
          boilerplate:
            typeof parsed.boilerplate === "string" ? parsed.boilerplate : "",
          contactBlock:
            typeof parsed.contactBlock === "string" ? parsed.contactBlock : "",
          openFields: Array.isArray(parsed.openFields)
            ? (parsed.openFields as string[])
            : [],
          quotePlaceholderNames: includeQuotePlaceholders,
          embargoIso: embargoIso || null,
          notForDistribution:
            "Draft only. Operator approval required before sending to any journalist or wire service.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Press release draft failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
