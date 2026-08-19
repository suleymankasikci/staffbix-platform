import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * categorize_expense — suggest a chart-of-accounts category for a
 * single expense line. Output:
 *   - suggestedCategory (must be in operator's chartOfAccounts)
 *   - confidence ('low'|'medium'|'high')
 *   - needsHumanReview: bool (true when confidence=low OR amount > review threshold)
 *   - reasoning: ≤30 words
 *   - flags: 0-3 strings — split candidate, possibly personal, VAT
 *     reclaimable, etc.
 *
 * Hard rules:
 *   - suggestedCategory restricted to operator's whitelist.
 *   - NEVER asserts deductibility (jurisdiction-specific tax law).
 */

const MODEL = "gpt-4o-mini";

const MIN_DESC_LEN = 1;
const MAX_DESC_LEN = 500;

const PERSONAL_TRIGGERS = [
  /\bgrocer\w*/i,
  /\bsupermarket\b/i,
  /\bclothing\b/i,
  /\bpersonal\b/i,
  /\bgift\b/i,
];

export const categorizeExpenseTool: Tool = {
  name: "categorize_expense",
  description:
    "Suggest a chart-of-accounts category for a single expense. Category is restricted to the operator's chartOfAccounts. NEVER asserts deductibility.",
  parameters: {
    type: "object",
    properties: {
      vendor: { type: "string", description: "Vendor name on the receipt." },
      description: { type: "string", description: "Free-form line description." },
      amountCents: {
        type: "integer",
        description: "Amount in cents (positive integer).",
        minimum: 1,
        maximum: 1_000_000_000,
      },
      dateIso: { type: "string", description: "ISO YYYY-MM-DD." },
      currencyCode: {
        type: "string",
        description: "ISO 4217 currency code (e.g., 'EUR', 'USD'). Default 'USD'.",
      },
      chartOfAccounts: {
        type: "array",
        description: "Operator-supplied category names (≤50).",
        items: { type: "string" },
      },
      reviewThresholdCents: {
        type: "integer",
        description: "Above this, needsHumanReview=true regardless of confidence. Default 100_000.",
        minimum: 0,
      },
    },
    required: ["vendor", "amountCents", "dateIso", "chartOfAccounts"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const vendor = String(args.vendor).trim().slice(0, 200);
    const description = args.description
      ? String(args.description).trim().slice(0, MAX_DESC_LEN)
      : "";
    const amountCents = Math.max(
      1,
      Math.min(1_000_000_000, Math.round(Number(args.amountCents))),
    );
    const dateIso = String(args.dateIso).trim();
    // Note: no .slice() here — validate raw input length so 'DOLLARS'
    // is rejected instead of silently truncated to 'DOL'.
    const currencyCode = args.currencyCode
      ? String(args.currencyCode).trim().toUpperCase()
      : "USD";
    const chartOfAccounts = Array.isArray(args.chartOfAccounts)
      ? (args.chartOfAccounts as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 50)
      : [];
    const reviewThresholdCents = Math.max(
      0,
      Math.round(Number(args.reviewThresholdCents ?? 100_000)),
    );

    if (vendor.length < 1) {
      return { ok: false, refused: true, reason: "vendor required." };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      return {
        ok: false,
        refused: true,
        reason: "dateIso must be YYYY-MM-DD.",
      };
    }
    if (chartOfAccounts.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: "chartOfAccounts required (operator's category whitelist).",
      };
    }
    if (!/^[A-Z]{3}$/.test(currencyCode)) {
      return {
        ok: false,
        refused: true,
        reason: "currencyCode must be a 3-letter ISO code.",
      };
    }
    if (description.length < MIN_DESC_LEN && vendor.length < 3) {
      return {
        ok: false,
        refused: true,
        reason: "Need at least a vendor (≥3 chars) or a description.",
      };
    }

    const systemPrompt = [
      "You are a bookkeeping assistant suggesting a chart-of-accounts category.",
      "Output STRICT JSON: { suggestedCategory, confidence, reasoning, flags }.",
      "suggestedCategory MUST be one of the supplied chartOfAccounts (verbatim).",
      "confidence: 'low' | 'medium' | 'high'.",
      "reasoning: ≤30 words — why this category, not the others.",
      "flags: 0-3 strings — split candidate, possibly personal, VAT reclaim hint, missing receipt note. Never assert tax deductibility.",
      "ABSOLUTE RULES:",
      "  - NEVER claim deductibility — that's the accountant's call.",
      "  - NEVER invent a category not in chartOfAccounts.",
      "  - Use 'uncategorized' or the closest match if nothing fits well; set confidence=low.",
      `chartOfAccounts: ${chartOfAccounts.join(" | ")}`,
    ].join("\n");

    const userContent = [
      `vendor: ${vendor}`,
      description ? `description: ${description}` : "",
      `amount: ${(amountCents / 100).toFixed(2)} ${currencyCode}`,
      `date: ${dateIso}`,
    ]
      .filter(Boolean)
      .join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 300,
        temperature: 0.15,
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

      const rawCat =
        typeof parsed.suggestedCategory === "string"
          ? (parsed.suggestedCategory as string)
          : "";
      const suggestedCategory = chartOfAccounts.includes(rawCat)
        ? rawCat
        : chartOfAccounts.find((c) => c.toLowerCase() === "uncategorized") ??
          chartOfAccounts[chartOfAccounts.length - 1];

      const confidence =
        typeof parsed.confidence === "string" &&
        ["low", "medium", "high"].includes(parsed.confidence as string)
          ? (parsed.confidence as string)
          : "low";

      const flags = Array.isArray(parsed.flags)
        ? (parsed.flags as string[]).slice(0, 3)
        : [];

      // Server-side personal-purchase nudge.
      const blob = `${vendor} ${description}`.toLowerCase();
      if (PERSONAL_TRIGGERS.some((re) => re.test(blob))) {
        flags.push(
          "Possibly personal — operator should confirm it's a business expense.",
        );
      }

      const needsHumanReview =
        confidence === "low" || amountCents > reviewThresholdCents;

      await logSecurityEvent({
        kind: "tax.expense.categorized",
        tenantId: ctx.tenantId,
        payload: {
          subject: "tax.expense.categorized",
          vendor,
          amountCents,
          currencyCode,
          suggestedCategory,
          confidence,
          needsHumanReview,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          vendor,
          description,
          amountCents,
          currencyCode,
          dateIso,
          suggestedCategory,
          confidence,
          reasoning:
            typeof parsed.reasoning === "string"
              ? (parsed.reasoning as string)
              : "",
          flags,
          needsHumanReview,
          reviewThresholdCents,
          chartOfAccountsCount: chartOfAccounts.length,
          notDeductibilityAdvice:
            "Category suggestion only. Final deductibility is the accountant's call under your jurisdiction.",
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Categorization failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
