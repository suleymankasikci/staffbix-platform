import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * evaluate_reorder — given a SKU's current state, decide whether to
 * place a reorder NOW. Pure arithmetic. Logic:
 *   - dailyDemand = trailing8WeekUnits / 56
 *   - daysOfCoverRemaining = currentStockUnits / dailyDemand
 *   - shouldReorder = daysOfCoverRemaining < (leadTimeDays + safetyDays)
 *     OR currentStockUnits / maxStockUnits < reorderThresholdPct/100
 *   - recommendedOrderQty = max(targetCoverDays - daysOfCoverRemaining, 0)
 *     × dailyDemand, rounded up to nearest min-order multiple
 *   - isUrgent = daysOfCoverRemaining < leadTimeDays
 *   - deadstockFlag = no sales in last 8 weeks AND currentStock > 0
 */

const MIN_TARGET_COVER = 14;
const DEFAULT_SAFETY_DAYS = 7;

export const evaluateReorderTool: Tool = {
  name: "evaluate_reorder",
  description:
    "Decide whether a SKU needs reordering NOW and how many units. Pure arithmetic: compares daysOfCover vs leadTime + safety days, OR stock % vs reorderThreshold. Returns urgency + recommended qty + deadstock flag.",
  parameters: {
    type: "object",
    properties: {
      sku: { type: "string" },
      currentStockUnits: { type: "integer", minimum: 0, maximum: 10_000_000 },
      maxStockUnits: {
        type: "integer",
        description: "Capacity / target max stock for the SKU.",
        minimum: 1,
        maximum: 10_000_000,
      },
      trailing8WeekUnits: {
        type: "integer",
        description: "Units sold over the trailing 8 weeks.",
        minimum: 0,
        maximum: 10_000_000,
      },
      leadTimeDays: {
        type: "integer",
        description: "Supplier lead time in days.",
        minimum: 1,
        maximum: 365,
      },
      reorderThresholdPct: {
        type: "integer",
        description: "Stock % threshold below which we reorder. Default 30.",
        minimum: 1,
        maximum: 100,
      },
      safetyDays: {
        type: "integer",
        description: "Days of safety stock to keep on top of lead time. Default 7.",
        minimum: 0,
        maximum: 90,
      },
      targetCoverDays: {
        type: "integer",
        description: "Days of cover we want after the reorder arrives. Default 60.",
        minimum: 14,
        maximum: 365,
      },
      minOrderUnits: {
        type: "integer",
        description: "Supplier MOQ. Order qty rounds up to this. Default 1.",
        minimum: 1,
        maximum: 10_000_000,
      },
    },
    required: [
      "sku",
      "currentStockUnits",
      "maxStockUnits",
      "trailing8WeekUnits",
      "leadTimeDays",
    ],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const sku = String(args.sku).trim();
    const currentStockUnits = Math.max(
      0,
      Math.round(Number(args.currentStockUnits)),
    );
    const maxStockUnits = Math.max(
      1,
      Math.round(Number(args.maxStockUnits)),
    );
    const trailing8WeekUnits = Math.max(
      0,
      Math.round(Number(args.trailing8WeekUnits)),
    );
    const leadTimeDays = Math.max(
      1,
      Math.min(365, Math.round(Number(args.leadTimeDays))),
    );
    const reorderThresholdPct = Math.max(
      1,
      Math.min(100, Math.round(Number(args.reorderThresholdPct ?? 30))),
    );
    const safetyDays = Math.max(
      0,
      Math.min(90, Math.round(Number(args.safetyDays ?? DEFAULT_SAFETY_DAYS))),
    );
    const targetCoverDays = Math.max(
      MIN_TARGET_COVER,
      Math.min(365, Math.round(Number(args.targetCoverDays ?? 60))),
    );
    const minOrderUnits = Math.max(
      1,
      Math.round(Number(args.minOrderUnits ?? 1)),
    );

    if (sku.length < 1) {
      return { ok: false, refused: true, reason: "sku required." };
    }
    if (currentStockUnits > maxStockUnits) {
      return {
        ok: false,
        refused: true,
        reason: "currentStockUnits cannot exceed maxStockUnits.",
      };
    }

    const dailyDemand = trailing8WeekUnits / 56;
    const daysOfCoverRemaining =
      dailyDemand > 0 ? currentStockUnits / dailyDemand : Infinity;
    const stockPct = (currentStockUnits / maxStockUnits) * 100;

    const reorderByCover =
      Number.isFinite(daysOfCoverRemaining) &&
      daysOfCoverRemaining < leadTimeDays + safetyDays;
    const reorderByPct = stockPct < reorderThresholdPct;
    const shouldReorder = reorderByCover || reorderByPct;

    const isUrgent =
      Number.isFinite(daysOfCoverRemaining) &&
      daysOfCoverRemaining < leadTimeDays;

    const deadstockFlag = trailing8WeekUnits === 0 && currentStockUnits > 0;

    let recommendedOrderQty = 0;
    if (shouldReorder && dailyDemand > 0) {
      const target = Math.ceil(targetCoverDays * dailyDemand);
      const raw = Math.max(0, target - currentStockUnits);
      const rounded = Math.ceil(raw / minOrderUnits) * minOrderUnits;
      // Don't exceed capacity headroom.
      const headroom = Math.max(0, maxStockUnits - currentStockUnits);
      recommendedOrderQty = Math.min(rounded, headroom);
    }

    const reasons: string[] = [];
    if (reorderByCover) {
      reasons.push(
        `daysOfCover (${daysOfCoverRemaining === Infinity ? "∞" : daysOfCoverRemaining.toFixed(1)}) < leadTime (${leadTimeDays}) + safety (${safetyDays}).`,
      );
    }
    if (reorderByPct) {
      reasons.push(
        `stockPct (${stockPct.toFixed(1)}%) < reorderThresholdPct (${reorderThresholdPct}%).`,
      );
    }
    if (isUrgent) {
      reasons.push(
        `URGENT: daysOfCover < leadTime — likely stockout before reorder arrives.`,
      );
    }
    if (deadstockFlag) {
      reasons.push(
        "deadstockFlag: no sales in trailing 8 weeks — consider clearance instead of reorder.",
      );
    }

    await logSecurityEvent({
      kind: "inventory.reorder.evaluated",
      tenantId: ctx.tenantId,
      payload: {
        subject: "inventory.reorder.evaluated",
        sku,
        currentStockUnits,
        trailing8WeekUnits,
        leadTimeDays,
        shouldReorder,
        isUrgent,
        deadstockFlag,
        recommendedOrderQty,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        sku,
        currentStockUnits,
        maxStockUnits,
        trailing8WeekUnits,
        dailyDemand: Number(dailyDemand.toFixed(3)),
        daysOfCoverRemaining:
          daysOfCoverRemaining === Infinity
            ? null
            : Number(daysOfCoverRemaining.toFixed(1)),
        stockPct: Number(stockPct.toFixed(1)),
        leadTimeDays,
        safetyDays,
        reorderThresholdPct,
        targetCoverDays,
        minOrderUnits,
        shouldReorder,
        isUrgent,
        deadstockFlag,
        recommendedOrderQty,
        reasons,
      },
    };
  },
};
