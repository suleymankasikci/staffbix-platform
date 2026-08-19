import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * compute_repricing — given a SKU's cost basis + the operator's
 * repricing strategy + a sample of competitor prices, recommend a
 * new price. Pure arithmetic — no LLM. Hard guardrails:
 *   - never below `cost + minMarginPct%`
 *   - never below `priceFloorCents`
 *   - never above the configured `ceilingCents` (if supplied)
 *
 * Strategies:
 *   - match_median: match competitor median
 *   - beat_by_pct: undercut median by `beatPct%`
 *   - hold_price: keep current price, recommend listing optimisation
 *   - manual_only: refuse — operator wants to set prices by hand
 */

const STRATEGIES = [
  "match_median",
  "beat_by_pct",
  "hold_price",
  "manual_only",
] as const;

export const computeRepricingTool: Tool = {
  name: "compute_repricing",
  description:
    "Compute a recommended new price for a SKU based on competitor prices, the operator's repricing strategy, and hard guardrails (min margin, price floor, ceiling). Pure arithmetic — never an LLM guess.",
  parameters: {
    type: "object",
    properties: {
      sku: { type: "string", description: "SKU / item identifier." },
      currentPriceCents: {
        type: "integer",
        description: "Current listing price in cents.",
        minimum: 1,
      },
      costCents: {
        type: "integer",
        description: "Landed cost in cents.",
        minimum: 0,
      },
      competitorPricesCents: {
        type: "array",
        description: "1-30 competitor prices in cents.",
        items: { type: "integer", minimum: 1 },
      },
      strategy: { type: "string", enum: STRATEGIES },
      beatPct: {
        type: "number",
        description: "For beat_by_pct: % to undercut the median by (1-15). Default 2.",
        minimum: 1,
        maximum: 15,
      },
      minMarginPct: {
        type: "number",
        description:
          "Minimum gross margin %. e.g. 20 → newPrice ≥ cost / (1 - 0.20). Default 15.",
        minimum: 0,
        maximum: 90,
      },
      priceFloorCents: {
        type: "integer",
        description: "Absolute lowest price allowed (in cents).",
        minimum: 0,
      },
      ceilingCents: {
        type: "integer",
        description: "Absolute highest price allowed. Optional.",
        minimum: 1,
      },
    },
    required: [
      "sku",
      "currentPriceCents",
      "costCents",
      "competitorPricesCents",
      "strategy",
    ],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const sku = String(args.sku).trim();
    const currentPriceCents = Math.round(Number(args.currentPriceCents));
    const costCents = Math.round(Number(args.costCents));
    const competitors = Array.isArray(args.competitorPricesCents)
      ? (args.competitorPricesCents as number[])
          .map((n) => Math.round(Number(n)))
          .filter((n) => Number.isFinite(n) && n > 0)
      : [];
    const strategy = String(args.strategy);
    const beatPct = Math.max(1, Math.min(15, Number(args.beatPct ?? 2)));
    const minMarginPct = Math.max(0, Math.min(90, Number(args.minMarginPct ?? 15)));
    const priceFloorCents = Math.max(0, Math.round(Number(args.priceFloorCents ?? 0)));
    const ceilingCents = args.ceilingCents
      ? Math.max(1, Math.round(Number(args.ceilingCents)))
      : null;

    if (sku.length < 1) {
      return { ok: false, refused: true, reason: "sku required." };
    }
    if (!Number.isFinite(currentPriceCents) || currentPriceCents <= 0) {
      return {
        ok: false,
        refused: true,
        reason: "currentPriceCents must be > 0.",
      };
    }
    if (!Number.isFinite(costCents) || costCents < 0) {
      return { ok: false, refused: true, reason: "costCents must be ≥ 0." };
    }
    if (!(STRATEGIES as readonly string[]).includes(strategy)) {
      return {
        ok: false,
        refused: true,
        reason: `strategy must be one of: ${STRATEGIES.join(", ")}`,
      };
    }
    if (competitors.length === 0 && strategy !== "manual_only" && strategy !== "hold_price") {
      return {
        ok: false,
        refused: true,
        reason: "competitorPricesCents required for repricing strategies.",
      };
    }
    if (ceilingCents !== null && ceilingCents < priceFloorCents) {
      return {
        ok: false,
        refused: true,
        reason: "ceilingCents must be ≥ priceFloorCents.",
      };
    }

    if (strategy === "manual_only") {
      return {
        ok: false,
        refused: true,
        reason: "Repricing strategy is 'manual_only' — operator handles pricing manually.",
      };
    }

    const median = computeMedian(competitors);

    // Hard floor: max of (cost-based min, priceFloorCents).
    const costBasedFloor =
      minMarginPct >= 90
        ? costCents * 10 // sanity ceiling for absurd margins
        : Math.ceil(costCents / (1 - minMarginPct / 100));
    const hardFloor = Math.max(costBasedFloor, priceFloorCents);

    let target: number;
    const strategyApplied = strategy;
    if (strategy === "hold_price") {
      target = currentPriceCents;
    } else if (strategy === "match_median") {
      target = median;
    } else {
      // beat_by_pct
      target = Math.round(median * (1 - beatPct / 100));
    }

    let recommendedPriceCents = target;
    const adjustments: string[] = [];

    if (recommendedPriceCents < hardFloor) {
      adjustments.push(
        `raised from ${target} to hard floor ${hardFloor} (cost-min margin ${minMarginPct}% / floor ${priceFloorCents})`,
      );
      recommendedPriceCents = hardFloor;
    }
    if (ceilingCents !== null && recommendedPriceCents > ceilingCents) {
      adjustments.push(`capped at ceiling ${ceilingCents}`);
      recommendedPriceCents = ceilingCents;
    }

    const deltaCents = recommendedPriceCents - currentPriceCents;
    const pctChange =
      currentPriceCents === 0
        ? null
        : Number(((deltaCents / currentPriceCents) * 100).toFixed(2));

    const grossMarginPct =
      recommendedPriceCents === 0
        ? 0
        : Number(
            (((recommendedPriceCents - costCents) / recommendedPriceCents) * 100).toFixed(2),
          );

    await logSecurityEvent({
      kind: "marketplace.reprice.computed",
      tenantId: ctx.tenantId,
      payload: {
        subject: "marketplace.reprice.computed",
        sku,
        strategy,
        currentPriceCents,
        recommendedPriceCents,
        median,
        adjustmentsCount: adjustments.length,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        sku,
        strategy: strategyApplied,
        currentPriceCents,
        median,
        recommendedPriceCents,
        deltaCents,
        pctChange,
        grossMarginPct,
        hardFloorCents: hardFloor,
        ceilingCents,
        adjustments,
        wouldReprice: recommendedPriceCents !== currentPriceCents,
      },
    };
  },
};

function computeMedian(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}
