import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * document_recurring_issue — produce a structured report for the
 * product team when an issue keeps coming back. Output:
 *   - title
 *   - problemStatement
 *   - frequency: { ticketsLast30d, customersAffected, severityMix }
 *   - customerQuoteHints: array of operator-supplied quote excerpts
 *     (verbatim — never invented)
 *   - suspectedRootCauses: 1-3 strings (LLM hypothesises but flags)
 *   - suggestedFixes: 2-5 strings
 *   - businessImpact: 1-2 sentences
 *
 * Hard rules:
 *   - NEVER invent quotes — customerQuoteHints is operator-supplied.
 *   - NEVER claim metrics not supplied.
 */

const MODEL = "gpt-4o-mini";

const MIN_SUMMARY_LEN = 30;
const MAX_SUMMARY_LEN = 3000;

export const documentRecurringIssueTool: Tool = {
  name: "document_recurring_issue",
  description:
    "Produce a structured product-team report for a recurring support issue. NEVER invents quotes — operator supplies the verbatim quote hints.",
  parameters: {
    type: "object",
    properties: {
      issueSummary: { type: "string", description: "1-3 sentences describing the issue." },
      ticketsLast30d: {
        type: "integer",
        description: "Number of tickets matching this issue in the last 30 days.",
        minimum: 1,
        maximum: 10_000,
      },
      customersAffected: {
        type: "integer",
        description: "Unique customer count affected.",
        minimum: 0,
        maximum: 10_000_000,
      },
      severityMix: {
        type: "object",
        description: "Counts by severity bucket. All optional ints, default 0.",
        properties: {
          P0: { type: "integer", minimum: 0 },
          P1: { type: "integer", minimum: 0 },
          P2: { type: "integer", minimum: 0 },
          P3: { type: "integer", minimum: 0 },
        },
      },
      customerQuoteHints: {
        type: "array",
        description: "Operator-supplied verbatim customer quotes (≤6). Each ≤200 chars.",
        items: { type: "string" },
      },
      productAreaHint: {
        type: "string",
        description: "Free-form area tag (e.g., 'auth', 'billing', 'mobile-app').",
      },
    },
    required: ["issueSummary", "ticketsLast30d"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const issueSummary = String(args.issueSummary).trim();
    const ticketsLast30d = Math.max(
      1,
      Math.min(10_000, Math.round(Number(args.ticketsLast30d))),
    );
    const customersAffected = Math.max(
      0,
      Math.round(Number(args.customersAffected ?? 0)),
    );
    const sevMixRaw = (args.severityMix as Record<string, unknown> | undefined) ?? {};
    const severityMix = {
      P0: Math.max(0, Math.round(Number(sevMixRaw.P0 ?? 0))),
      P1: Math.max(0, Math.round(Number(sevMixRaw.P1 ?? 0))),
      P2: Math.max(0, Math.round(Number(sevMixRaw.P2 ?? 0))),
      P3: Math.max(0, Math.round(Number(sevMixRaw.P3 ?? 0))),
    };
    const customerQuoteHints = Array.isArray(args.customerQuoteHints)
      ? (args.customerQuoteHints as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .map((s) => s.slice(0, 200))
          .slice(0, 6)
      : [];
    const productAreaHint = args.productAreaHint
      ? String(args.productAreaHint).trim().slice(0, 60)
      : "";

    if (issueSummary.length < MIN_SUMMARY_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `issueSummary too short (need ≥${MIN_SUMMARY_LEN} chars).`,
      };
    }
    if (issueSummary.length > MAX_SUMMARY_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `issueSummary too long (max ${MAX_SUMMARY_LEN} chars).`,
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `support voice product report ${productAreaHint}`.slice(0, 200),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const quotesBlock =
      customerQuoteHints.length > 0
        ? `Operator-supplied verbatim quotes (use only these — do not invent):\n${customerQuoteHints.map((q) => `  - "${q}"`).join("\n")}`
        : "No operator-supplied quotes — customerQuoteHints in output MUST be empty.";

    const systemPrompt = [
      "You are Tier-2 Support writing a recurring-issue report for the product team.",
      "Output STRICT JSON: { title, problemStatement, frequency, customerQuoteHints, suspectedRootCauses, suggestedFixes, businessImpact }.",
      "title: ≤60 chars.",
      "problemStatement: 2-3 sentences. Concrete, not vague.",
      "frequency: object with ticketsLast30d + customersAffected + severityMix — echo the supplied values.",
      "customerQuoteHints: array — use ONLY operator-supplied quotes; otherwise EMPTY array.",
      "suspectedRootCauses: 1-3 strings. Mark each as a hypothesis, not a conclusion.",
      "suggestedFixes: 2-5 strings, ordered by tractability.",
      "businessImpact: 1-2 sentences referencing the supplied metrics.",
      "ABSOLUTE RULES:",
      "  - NEVER invent customer quotes.",
      "  - NEVER claim metrics not supplied in input.",
      productAreaHint ? `productAreaHint: ${productAreaHint}` : "",
      quotesBlock,
      "Brand Bible context:",
      bbBlock,
    ]
      .filter(Boolean)
      .join("\n");

    const userContent = [
      `ticketsLast30d: ${ticketsLast30d}`,
      `customersAffected: ${customersAffected}`,
      `severityMix: P0=${severityMix.P0} P1=${severityMix.P1} P2=${severityMix.P2} P3=${severityMix.P3}`,
      "",
      "issueSummary:",
      issueSummary,
    ].join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 1100,
        temperature: 0.25,
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

      // Whitelist quotes server-side: only allow strings that appear
      // in operator-supplied customerQuoteHints.
      const allowedQuotes = new Set(customerQuoteHints);
      const rawQuotes = Array.isArray(parsed.customerQuoteHints)
        ? (parsed.customerQuoteHints as string[])
        : [];
      const filteredQuotes = rawQuotes.filter((q) => allowedQuotes.has(q));

      await logSecurityEvent({
        kind: "tier2.recurring.documented",
        tenantId: ctx.tenantId,
        payload: {
          subject: "tier2.recurring.documented",
          ticketsLast30d,
          customersAffected,
          quotesSupplied: customerQuoteHints.length,
          quotesDropped: rawQuotes.length - filteredQuotes.length,
          productAreaHint: productAreaHint || null,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          title: typeof parsed.title === "string" ? parsed.title : "",
          problemStatement:
            typeof parsed.problemStatement === "string"
              ? parsed.problemStatement
              : "",
          frequency: {
            ticketsLast30d,
            customersAffected,
            severityMix,
          },
          customerQuoteHints: filteredQuotes,
          suspectedRootCauses: Array.isArray(parsed.suspectedRootCauses)
            ? (parsed.suspectedRootCauses as string[]).slice(0, 3)
            : [],
          suggestedFixes: Array.isArray(parsed.suggestedFixes)
            ? (parsed.suggestedFixes as string[]).slice(0, 5)
            : [],
          businessImpact:
            typeof parsed.businessImpact === "string"
              ? parsed.businessImpact
              : "",
          productAreaHint: productAreaHint || null,
          notForFiling:
            "Report only. Tier-2 hands to PM / engineering manually.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Recurring-issue report failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
