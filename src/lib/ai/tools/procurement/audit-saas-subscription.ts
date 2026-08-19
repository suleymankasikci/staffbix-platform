import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * audit_saas_subscription — classify a SaaS subscription into a
 * recommended action. Pure rules.
 *
 * Logic (in order):
 *   1. lastLoginDays > 60 AND utilization < 20% → 'cancel'
 *   2. utilization < 30% OR (monthlyCostUsd ≥ 50 AND utilization < 25%)
 *      → 'cancel' if no contract lock, else 'downsize'
 *   3. utilization < 60% → 'downsize' (suggest right-sized seat count)
 *   4. monthlyCostUsd > 1000 AND utilization < 80% → 'renegotiate'
 *   5. else → 'keep'
 *
 * Bonus signals:
 *   - daysToContractEnd < 30 + recommendedAction != 'keep' → set
 *     isUrgent=true
 *   - costPerActiveUserMonthly + monthlyWaste numbers
 */

const MAX_REASONS = 5;

export const auditSaasSubscriptionTool: Tool = {
  name: "audit_saas_subscription",
  description:
    "Classify a SaaS subscription as keep / renegotiate / downsize / cancel based on utilization, cost, login recency, and contract timing. Pure arithmetic — no LLM.",
  parameters: {
    type: "object",
    properties: {
      vendor: { type: "string" },
      monthlyCostUsd: {
        type: "number",
        description: "Monthly cost in USD.",
        minimum: 0,
        maximum: 100_000,
      },
      seats: {
        type: "integer",
        description: "Total seats paid for.",
        minimum: 1,
        maximum: 10_000,
      },
      activeUsersLast30d: {
        type: "integer",
        description: "Distinct active users in the last 30 days.",
        minimum: 0,
        maximum: 10_000,
      },
      lastLoginDays: {
        type: "integer",
        description: "Days since ANY user last logged in.",
        minimum: 0,
        maximum: 3650,
      },
      contractEndIso: {
        type: "string",
        description: "ISO YYYY-MM-DD — when contract ends. Optional.",
      },
      hasContractLockIn: {
        type: "boolean",
        description: "If true, mid-term cancellation isn't allowed → tool downgrades 'cancel' to 'downsize'.",
      },
    },
    required: [
      "vendor",
      "monthlyCostUsd",
      "seats",
      "activeUsersLast30d",
      "lastLoginDays",
    ],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const vendor = String(args.vendor).trim().slice(0, 200);
    const monthlyCostUsd = Math.max(0, Number(args.monthlyCostUsd));
    const seats = Math.max(1, Math.round(Number(args.seats)));
    const activeUsersLast30d = Math.max(
      0,
      Math.round(Number(args.activeUsersLast30d)),
    );
    const lastLoginDays = Math.max(0, Math.round(Number(args.lastLoginDays)));
    const contractEndIso = args.contractEndIso
      ? String(args.contractEndIso).trim()
      : "";
    const hasContractLockIn = Boolean(args.hasContractLockIn);

    if (vendor.length < 1) {
      return { ok: false, refused: true, reason: "vendor required." };
    }
    if (activeUsersLast30d > seats) {
      return {
        ok: false,
        refused: true,
        reason: "activeUsersLast30d cannot exceed seats.",
      };
    }
    if (contractEndIso && !/^\d{4}-\d{2}-\d{2}$/.test(contractEndIso)) {
      return {
        ok: false,
        refused: true,
        reason: "contractEndIso must be YYYY-MM-DD if supplied.",
      };
    }

    const utilization = seats === 0 ? 0 : (activeUsersLast30d / seats) * 100;
    const costPerActiveUserMonthly =
      activeUsersLast30d === 0
        ? null
        : Number((monthlyCostUsd / activeUsersLast30d).toFixed(2));
    const monthlyWasteUsd = Number(
      (monthlyCostUsd * (1 - Math.min(1, utilization / 100))).toFixed(2),
    );
    const annualWasteUsd = Math.round(monthlyWasteUsd * 12);

    const reasons: string[] = [];
    let recommendedAction: "keep" | "renegotiate" | "downsize" | "cancel" =
      "keep";

    if (lastLoginDays > 60 && utilization < 20) {
      recommendedAction = "cancel";
      reasons.push(
        `No login in ${lastLoginDays}d AND utilization ${utilization.toFixed(0)}% < 20%.`,
      );
    } else if (
      utilization < 30 ||
      (monthlyCostUsd >= 50 && utilization < 25)
    ) {
      recommendedAction = "cancel";
      reasons.push(
        `Low utilization ${utilization.toFixed(0)}% — candidate for cancellation.`,
      );
    } else if (utilization < 60) {
      recommendedAction = "downsize";
      reasons.push(
        `Utilization ${utilization.toFixed(0)}% < 60% — downsize seats to ~${Math.max(1, Math.ceil((activeUsersLast30d * 1.2) || 1))}.`,
      );
    } else if (monthlyCostUsd > 1000 && utilization < 80) {
      recommendedAction = "renegotiate";
      reasons.push(
        `Spend $${monthlyCostUsd.toFixed(0)}/mo with ${utilization.toFixed(0)}% utilization — renegotiation candidate.`,
      );
    } else {
      recommendedAction = "keep";
      reasons.push(
        `Utilization ${utilization.toFixed(0)}% with cost $${monthlyCostUsd.toFixed(0)}/mo — keep.`,
      );
    }

    // Contract lock-in override: cancel → downsize when locked.
    if (recommendedAction === "cancel" && hasContractLockIn) {
      recommendedAction = "downsize";
      reasons.push(
        "Contract lock-in active — downgrading 'cancel' to 'downsize' until contract ends.",
      );
    }

    let daysToContractEnd: number | null = null;
    if (contractEndIso) {
      const endMs = Date.parse(contractEndIso);
      if (Number.isFinite(endMs)) {
        daysToContractEnd = Math.round(
          (endMs - Date.now()) / 86_400_000,
        );
      }
    }
    const isUrgent =
      daysToContractEnd !== null &&
      daysToContractEnd <= 30 &&
      recommendedAction !== "keep";
    if (isUrgent) {
      reasons.push(
        `Contract ends in ${daysToContractEnd}d — act before auto-renew.`,
      );
    }

    const recommendedSeats =
      recommendedAction === "downsize"
        ? Math.max(1, Math.ceil((activeUsersLast30d * 1.2) || 1))
        : recommendedAction === "cancel"
          ? 0
          : seats;

    await logSecurityEvent({
      kind: "procurement.saas.audited",
      tenantId: ctx.tenantId,
      payload: {
        subject: "procurement.saas.audited",
        vendor,
        recommendedAction,
        utilization: Math.round(utilization),
        monthlyWasteUsd,
        annualWasteUsd,
        isUrgent,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        vendor,
        monthlyCostUsd,
        seats,
        activeUsersLast30d,
        utilization: Number(utilization.toFixed(1)),
        costPerActiveUserMonthly,
        monthlyWasteUsd,
        annualWasteUsd,
        recommendedAction,
        recommendedSeats,
        reasons: reasons.slice(0, MAX_REASONS),
        isUrgent,
        daysToContractEnd,
        hasContractLockIn,
      },
    };
  },
};
