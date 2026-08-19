import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * compare_quotes — weighted comparison of N supplier quotes. Pure
 * arithmetic. Each quote scored on price + lead time + supplier
 * reliability; weighted total drives a recommendation.
 *
 * Tie-break order: lower price → shorter lead time → higher
 * reliability → alphabetical supplierName.
 *
 * Output:
 *   - scored: [{ supplierName, totalPriceUsd, leadTimeDays,
 *     reliabilityScore, weightedTotal, normalised: { price, leadTime,
 *     reliability } }] sorted best-first.
 *   - recommendation: { supplierName, rationale }
 *   - tieBreakApplied: boolean
 *   - savingsVsHighestUsd: number
 */

const WEIGHTS_DEFAULT = { price: 0.5, leadTime: 0.3, reliability: 0.2 };

const MAX_QUOTES = 10;

export const compareQuotesTool: Tool = {
  name: "compare_quotes",
  description:
    "Compare 2-10 supplier quotes with weighted scoring (price + lead time + reliability) and recommend a winner. Pure arithmetic with deterministic tie-break (price → leadTime → reliability → name).",
  parameters: {
    type: "object",
    properties: {
      itemName: { type: "string" },
      quotes: {
        type: "array",
        description: "2-10 quote entries.",
        items: {
          type: "object",
          properties: {
            supplierName: { type: "string" },
            totalPriceUsd: { type: "number", minimum: 0 },
            leadTimeDays: { type: "integer", minimum: 0, maximum: 365 },
            reliabilityScore: { type: "integer", minimum: 0, maximum: 100 },
          },
        },
      },
      weights: {
        type: "object",
        description:
          "Optional weights. Sum should be ~1.0. Defaults: price 0.5, leadTime 0.3, reliability 0.2.",
        properties: {
          price: { type: "number", minimum: 0, maximum: 1 },
          leadTime: { type: "number", minimum: 0, maximum: 1 },
          reliability: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    required: ["itemName", "quotes"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const itemName = String(args.itemName).trim();
    const rawQuotes = Array.isArray(args.quotes)
      ? (args.quotes as Array<Record<string, unknown>>)
      : [];
    if (rawQuotes.length < 2) {
      return {
        ok: false,
        refused: true,
        reason: "quotes must have ≥2 entries.",
      };
    }
    if (rawQuotes.length > MAX_QUOTES) {
      return {
        ok: false,
        refused: true,
        reason: `quotes too many (max ${MAX_QUOTES}).`,
      };
    }
    if (itemName.length < 2) {
      return { ok: false, refused: true, reason: "itemName too short." };
    }

    const quotes = rawQuotes.map((q) => ({
      supplierName: typeof q.supplierName === "string" ? q.supplierName.trim() : "",
      totalPriceUsd: Math.max(0, Number(q.totalPriceUsd)),
      leadTimeDays: Math.max(0, Math.min(365, Math.round(Number(q.leadTimeDays)))),
      reliabilityScore: Math.max(
        0,
        Math.min(100, Math.round(Number(q.reliabilityScore))),
      ),
    }));

    for (const q of quotes) {
      if (q.supplierName.length === 0) {
        return {
          ok: false,
          refused: true,
          reason: "Every quote needs a supplierName.",
        };
      }
      if (!Number.isFinite(q.totalPriceUsd) || q.totalPriceUsd <= 0) {
        return {
          ok: false,
          refused: true,
          reason: `Quote for '${q.supplierName}' has invalid totalPriceUsd.`,
        };
      }
    }

    const rawWeights = (args.weights as Record<string, unknown> | undefined) ?? {};
    const weights = {
      price: Math.max(
        0,
        Math.min(1, Number(rawWeights.price ?? WEIGHTS_DEFAULT.price)),
      ),
      leadTime: Math.max(
        0,
        Math.min(1, Number(rawWeights.leadTime ?? WEIGHTS_DEFAULT.leadTime)),
      ),
      reliability: Math.max(
        0,
        Math.min(
          1,
          Number(rawWeights.reliability ?? WEIGHTS_DEFAULT.reliability),
        ),
      ),
    };
    const wSum = weights.price + weights.leadTime + weights.reliability;
    if (wSum <= 0) {
      return {
        ok: false,
        refused: true,
        reason: "weights must sum to > 0.",
      };
    }
    // Normalise weights to sum to 1.
    weights.price /= wSum;
    weights.leadTime /= wSum;
    weights.reliability /= wSum;

    const prices = quotes.map((q) => q.totalPriceUsd);
    const leadTimes = quotes.map((q) => q.leadTimeDays);

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const minLead = Math.min(...leadTimes);
    const maxLead = Math.max(...leadTimes);

    // Normalise to 0-100 where higher is better:
    //   priceScore = 100 * (maxPrice - p) / (maxPrice - minPrice)
    //   leadScore  = 100 * (maxLead  - l) / (maxLead  - minLead)
    //   reliability already 0-100 (higher = better)
    const scored = quotes
      .map((q) => {
        const priceN =
          maxPrice === minPrice
            ? 100
            : Math.round(
                ((maxPrice - q.totalPriceUsd) / (maxPrice - minPrice)) * 100,
              );
        const leadN =
          maxLead === minLead
            ? 100
            : Math.round(
                ((maxLead - q.leadTimeDays) / (maxLead - minLead)) * 100,
              );
        const reliabilityN = q.reliabilityScore;
        const weightedTotal = Number(
          (
            priceN * weights.price +
            leadN * weights.leadTime +
            reliabilityN * weights.reliability
          ).toFixed(2),
        );
        return {
          supplierName: q.supplierName,
          totalPriceUsd: q.totalPriceUsd,
          leadTimeDays: q.leadTimeDays,
          reliabilityScore: q.reliabilityScore,
          normalised: {
            price: priceN,
            leadTime: leadN,
            reliability: reliabilityN,
          },
          weightedTotal,
        };
      })
      .sort((a, b) => {
        if (b.weightedTotal !== a.weightedTotal)
          return b.weightedTotal - a.weightedTotal;
        if (a.totalPriceUsd !== b.totalPriceUsd)
          return a.totalPriceUsd - b.totalPriceUsd;
        if (a.leadTimeDays !== b.leadTimeDays)
          return a.leadTimeDays - b.leadTimeDays;
        if (b.reliabilityScore !== a.reliabilityScore)
          return b.reliabilityScore - a.reliabilityScore;
        return a.supplierName.localeCompare(b.supplierName);
      });

    const winner = scored[0];
    const runnerUp = scored[1];
    const tieBreakApplied = Boolean(
      runnerUp && winner.weightedTotal === runnerUp.weightedTotal,
    );

    const savingsVsHighestUsd =
      Math.max(...prices) - winner.totalPriceUsd;

    const rationale = [
      `Highest weighted score (${winner.weightedTotal}/100) — price ${winner.normalised.price}, leadTime ${winner.normalised.leadTime}, reliability ${winner.normalised.reliability}.`,
      tieBreakApplied
        ? `Tie-break applied (next best ${runnerUp?.supplierName} matched score; resolved by price → leadTime → reliability → name).`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    await logSecurityEvent({
      kind: "purchasing.quotes.compared",
      tenantId: ctx.tenantId,
      payload: {
        subject: "purchasing.quotes.compared",
        itemName,
        quotesCount: scored.length,
        winner: winner.supplierName,
        weightedTotal: winner.weightedTotal,
        savingsVsHighestUsd,
        tieBreakApplied,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        itemName,
        weights,
        scored,
        recommendation: {
          supplierName: winner.supplierName,
          rationale,
        },
        tieBreakApplied,
        savingsVsHighestUsd: Number(savingsVsHighestUsd.toFixed(2)),
      },
    };
  },
};
