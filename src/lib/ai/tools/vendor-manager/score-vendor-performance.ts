import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * score_vendor_performance — weighted scoring of a vendor across 4
 * standard signals. Pure arithmetic.
 *
 * Signals (each normalised to 0-100, higher = better):
 *   - onTimeDeliveryPct (40%)
 *   - defectPctInverse = 100 - defectPct (20%)
 *   - billingAccuracyPct (20%)
 *   - responseHoursInverse = max(0, 100 - responseHours * 4) (20%)
 *
 * Bands:
 *   - ≥85 → 'preferred'
 *   - 70-84 → 'standard'
 *   - 50-69 → 'probation'
 *   - <50  → 'drop'
 *
 * Override: if defectPct ≥ 10 OR onTimeDeliveryPct < 50, category is
 * forced to 'probation' or worse (regardless of weighted score).
 */

type VendorCategory = "preferred" | "standard" | "probation" | "drop";

export const scoreVendorPerformanceTool: Tool = {
  name: "score_vendor_performance",
  description:
    "Score a vendor 0-100 from 4 signals (on-time delivery, defect %, billing accuracy, response time) with category band. Hard overrides for severe defect / on-time misses.",
  parameters: {
    type: "object",
    properties: {
      vendorName: { type: "string" },
      periodLabel: {
        type: "string",
        description: "Free-form period label (e.g., 'Q1 2026'). ≤40 chars.",
      },
      onTimeDeliveryPct: {
        type: "number",
        description: "% of orders delivered on or before promised date. 0-100.",
        minimum: 0,
        maximum: 100,
      },
      defectPct: {
        type: "number",
        description: "% of units defective / returned for quality. 0-100.",
        minimum: 0,
        maximum: 100,
      },
      billingAccuracyPct: {
        type: "number",
        description: "% of invoices that matched PO without dispute. 0-100.",
        minimum: 0,
        maximum: 100,
      },
      avgResponseHours: {
        type: "number",
        description: "Avg hours to first response on operator inbound. 0-1000.",
        minimum: 0,
        maximum: 1000,
      },
      orderCount: {
        type: "integer",
        description: "Total orders in the period. Used for confidence.",
        minimum: 0,
      },
    },
    required: [
      "vendorName",
      "periodLabel",
      "onTimeDeliveryPct",
      "defectPct",
      "billingAccuracyPct",
      "avgResponseHours",
    ],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const vendorName = String(args.vendorName).trim();
    const periodLabel = String(args.periodLabel).trim().slice(0, 40);
    const onTimeDeliveryPct = Math.max(0, Math.min(100, Number(args.onTimeDeliveryPct)));
    const defectPct = Math.max(0, Math.min(100, Number(args.defectPct)));
    const billingAccuracyPct = Math.max(0, Math.min(100, Number(args.billingAccuracyPct)));
    const avgResponseHours = Math.max(0, Math.min(1000, Number(args.avgResponseHours)));
    const orderCount = Math.max(0, Math.round(Number(args.orderCount ?? 0)));

    if (vendorName.length < 2) {
      return { ok: false, refused: true, reason: "vendorName too short." };
    }
    if (periodLabel.length < 2) {
      return { ok: false, refused: true, reason: "periodLabel too short." };
    }

    const weights = {
      onTime: 0.4,
      defect: 0.2,
      billing: 0.2,
      response: 0.2,
    };

    const responseNormalised = Math.max(
      0,
      Math.min(100, 100 - avgResponseHours * 4),
    );
    const defectNormalised = Math.max(0, 100 - defectPct);

    const weightedScore =
      onTimeDeliveryPct * weights.onTime +
      defectNormalised * weights.defect +
      billingAccuracyPct * weights.billing +
      responseNormalised * weights.response;

    const rawScore = Math.round(weightedScore);

    let category: VendorCategory;
    if (rawScore >= 85) category = "preferred";
    else if (rawScore >= 70) category = "standard";
    else if (rawScore >= 50) category = "probation";
    else category = "drop";

    const overrideReasons: string[] = [];
    if (defectPct >= 10) {
      overrideReasons.push(
        `defectPct (${defectPct}) ≥ 10 — auto-downgrade to probation at minimum.`,
      );
      if (category === "preferred" || category === "standard") {
        category = "probation";
      }
    }
    if (onTimeDeliveryPct < 50) {
      overrideReasons.push(
        `onTimeDeliveryPct (${onTimeDeliveryPct}) < 50 — auto-downgrade to drop.`,
      );
      category = "drop";
    }

    const confidence: "low" | "medium" | "high" =
      orderCount < 5 ? "low" : orderCount < 25 ? "medium" : "high";

    await logSecurityEvent({
      kind: "vendor.performance.scored",
      tenantId: ctx.tenantId,
      payload: {
        subject: "vendor.performance.scored",
        vendorName,
        periodLabel,
        rawScore,
        category,
        overrideApplied: overrideReasons.length > 0,
        confidence,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        vendorName,
        periodLabel,
        weightedScore: rawScore,
        category,
        confidence,
        signals: {
          onTimeDeliveryPct,
          defectPct,
          billingAccuracyPct,
          avgResponseHours,
        },
        normalisedSignals: {
          onTime: Math.round(onTimeDeliveryPct),
          defect: Math.round(defectNormalised),
          billing: Math.round(billingAccuracyPct),
          response: Math.round(responseNormalised),
        },
        weights,
        overrideReasons,
        orderCount,
      },
    };
  },
};
