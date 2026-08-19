import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * draft_renewal_play — LLM-driven renewal save play. Output:
 *   - subjectLines: 3 variants
 *   - body: ≤180 words
 *   - primaryOffer: 1 sentence summarising the offer within authority
 *   - fallbackOffers: 1-3 fallbacks (still within authority)
 *   - escalateOnRejection: boolean — true if no fallback can close
 *
 * Hard rules:
 *   - NEVER offer a discount above maxDiscountPct.
 *   - NEVER promise contract terms not in operator authority.
 */

const MODEL = "gpt-4o-mini";

const SEGMENTS = ["smb", "mid_market", "enterprise"] as const;
const RISK_BANDS = ["low", "medium", "high", "critical"] as const;

const MIN_CONTEXT_LEN = 30;
const MAX_CONTEXT_LEN = 3000;

const MAX_DISCOUNT_HARD_CAP = 50; // never above 50% no matter what authority says

export const draftRenewalPlayTool: Tool = {
  name: "draft_renewal_play",
  description:
    "Draft a renewal save play (3 subject lines + body + primary offer + fallback offers + escalateOnRejection). NEVER exceeds maxDiscountPct; NEVER promises terms outside authority.",
  parameters: {
    type: "object",
    properties: {
      accountName: { type: "string" },
      segment: { type: "string", enum: SEGMENTS },
      currentArrUsd: {
        type: "number",
        description: "Current ARR for this account, USD.",
        minimum: 0,
      },
      renewalDateIso: {
        type: "string",
        description: "ISO YYYY-MM-DD renewal date.",
      },
      riskBand: { type: "string", enum: RISK_BANDS },
      accountContext: {
        type: "string",
        description: "1-3 sentences with the account's situation (usage, support, recent feedback).",
      },
      maxDiscountPct: {
        type: "number",
        description: "Operator's discount authority. Default 15. Hard cap 50.",
        minimum: 0,
        maximum: MAX_DISCOUNT_HARD_CAP,
      },
      multiYearAuthority: {
        type: "boolean",
        description: "Can the rep offer multi-year terms? Default false.",
      },
    },
    required: ["accountName", "segment", "renewalDateIso", "riskBand", "accountContext"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const accountName = String(args.accountName).trim();
    const segment = String(args.segment);
    const currentArrUsd = Math.max(0, Number(args.currentArrUsd ?? 0));
    const renewalDateIso = String(args.renewalDateIso).trim();
    const riskBand = String(args.riskBand);
    const accountContext = String(args.accountContext).trim();
    const maxDiscountPct = Math.max(
      0,
      Math.min(MAX_DISCOUNT_HARD_CAP, Number(args.maxDiscountPct ?? 15)),
    );
    const multiYearAuthority = Boolean(args.multiYearAuthority);

    if (!(SEGMENTS as readonly string[]).includes(segment)) {
      return {
        ok: false,
        refused: true,
        reason: `segment must be one of: ${SEGMENTS.join(", ")}`,
      };
    }
    if (!(RISK_BANDS as readonly string[]).includes(riskBand)) {
      return {
        ok: false,
        refused: true,
        reason: `riskBand must be one of: ${RISK_BANDS.join(", ")}`,
      };
    }
    if (accountName.length < 2) {
      return { ok: false, refused: true, reason: "accountName too short." };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(renewalDateIso)) {
      return {
        ok: false,
        refused: true,
        reason: "renewalDateIso must be YYYY-MM-DD.",
      };
    }
    if (accountContext.length < MIN_CONTEXT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `accountContext too short (need ≥${MIN_CONTEXT_LEN} chars).`,
      };
    }
    if (accountContext.length > MAX_CONTEXT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `accountContext too long (max ${MAX_CONTEXT_LEN} chars).`,
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `renewal save play ${segment} ${riskBand}`.slice(0, 300),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const authorityClause = [
      `Discount authority: up to ${maxDiscountPct}% off. NEVER exceed this.`,
      multiYearAuthority
        ? "Multi-year terms ARE authorised — primary offer may include 2-year commit."
        : "Multi-year terms are NOT authorised — do not propose anything beyond a 1-year renewal.",
    ].join("\n");

    const systemPrompt = [
      "You are the Renewal Specialist drafting a save play.",
      "Output STRICT JSON: { subjectLines, body, primaryOffer, fallbackOffers, escalateOnRejection, warnings }.",
      "subjectLines: EXACTLY 3 strings ≤60 chars.",
      "body: ≤180 words. Reference accountContext verbatim where helpful. NO 'as an AI'.",
      "primaryOffer: 1 sentence — the headline offer. MUST stay within authority.",
      "fallbackOffers: 1-3 sentences. Each MUST stay within authority.",
      "escalateOnRejection: true if no in-authority fallback would likely close.",
      "warnings: 0-3 strings — risks the operator should know.",
      "ABSOLUTE RULES:",
      `  - NEVER mention or imply discounts > ${maxDiscountPct}%.`,
      multiYearAuthority
        ? "  - Multi-year offers are OK if they help close."
        : "  - NEVER propose multi-year commitments.",
      "  - NEVER invent customer logos / case studies / past commitments.",
      authorityClause,
      `accountName: ${accountName}`,
      `segment: ${segment}`,
      `currentArrUsd: ${currentArrUsd}`,
      `renewalDateIso: ${renewalDateIso}`,
      `riskBand: ${riskBand}`,
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: accountContext },
        ],
        max_tokens: 900,
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

      // Server-side scan for any % above maxDiscountPct.
      const blob = JSON.stringify(parsed);
      const pctMatches = Array.from(blob.matchAll(/(\d{1,3})\s*%/g))
        .map((m) => Number(m[1]))
        .filter((n) => Number.isFinite(n));
      const exceededDiscount = pctMatches.some(
        (n) => n > maxDiscountPct && n <= 100,
      );

      const warnings = Array.isArray(parsed.warnings)
        ? (parsed.warnings as string[])
        : [];
      if (exceededDiscount) {
        warnings.unshift(
          `Draft mentioned a % value above the authorised maxDiscountPct (${maxDiscountPct}). Operator MUST review before sending.`,
        );
      }

      await logSecurityEvent({
        kind: "renewal.play.drafted",
        tenantId: ctx.tenantId,
        payload: {
          subject: "renewal.play.drafted",
          accountName,
          segment,
          riskBand,
          maxDiscountPct,
          multiYearAuthority,
          exceededDiscountFlag: exceededDiscount,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          accountName,
          segment,
          riskBand,
          renewalDateIso,
          maxDiscountPct,
          multiYearAuthority,
          subjectLines: Array.isArray(parsed.subjectLines)
            ? (parsed.subjectLines as string[]).slice(0, 3)
            : [],
          body: typeof parsed.body === "string" ? parsed.body : "",
          primaryOffer:
            typeof parsed.primaryOffer === "string"
              ? parsed.primaryOffer
              : "",
          fallbackOffers: Array.isArray(parsed.fallbackOffers)
            ? (parsed.fallbackOffers as string[])
            : [],
          escalateOnRejection: Boolean(parsed.escalateOnRejection),
          warnings,
          exceededDiscountFlag: exceededDiscount,
          notForSend:
            "Draft only. AM signs off on the offer before any send.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Renewal play failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
