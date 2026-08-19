import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * score_churn_risk — deterministic churn-risk score 0-100 from a
 * handful of explicit account signals. Higher = more risk.
 *
 * Weights (sum to 1.0):
 *   - usageTrendPct (down = bad) … 0.30
 *   - supportTicketTrendPct (up = bad) … 0.20
 *   - npsLatest (low = bad) … 0.20
 *   - paymentLateDays (more = bad) … 0.15
 *   - daysSinceLastLogin (more = bad) … 0.15
 *
 * Each signal is normalised to 0-100 risk contribution; the result is
 * a weighted sum. We also return contributingFactors[] sorted by
 * contribution so the operator can see WHY the score is what it is.
 */

const ALERT_DEFAULT_THRESHOLD = 50;
const HIGH_RISK_THRESHOLD = 75;

export const scoreChurnRiskTool: Tool = {
  name: "score_churn_risk",
  description:
    "Compute a churn-risk score 0-100 from explicit account signals (usage trend, support volume, NPS, payment lateness, login recency). Pure arithmetic. Returns contributingFactors sorted by impact + booleans for alert / high-risk thresholds.",
  parameters: {
    type: "object",
    properties: {
      accountId: {
        type: "string",
        description: "Internal account identifier. Free-form ≤120 chars.",
      },
      usageTrendPct: {
        type: "number",
        description: "Trailing 30-day usage vs prior 30 days, % change. Negative = down = risk.",
        minimum: -100,
        maximum: 1000,
      },
      supportTicketTrendPct: {
        type: "number",
        description: "Trailing 30-day support-ticket count vs prior 30 days, % change. Positive = more tickets = risk.",
        minimum: -100,
        maximum: 1000,
      },
      npsLatest: {
        type: "integer",
        description: "Latest NPS response from the account, -100 to 100. Null if no response — pass 0 to neutralise.",
        minimum: -100,
        maximum: 100,
      },
      paymentLateDays: {
        type: "integer",
        description: "Number of days the most recent invoice is late. 0 = on time.",
        minimum: 0,
        maximum: 365,
      },
      daysSinceLastLogin: {
        type: "integer",
        description: "Days since the account's last login.",
        minimum: 0,
        maximum: 1825,
      },
      alertThreshold: {
        type: "integer",
        description: "Threshold for the 'alert' boolean. Default 50.",
        minimum: 1,
        maximum: 100,
      },
    },
    required: [
      "accountId",
      "usageTrendPct",
      "supportTicketTrendPct",
      "npsLatest",
      "paymentLateDays",
      "daysSinceLastLogin",
    ],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const accountId = String(args.accountId).trim().slice(0, 120);
    const usageTrendPct = Number(args.usageTrendPct);
    const supportTicketTrendPct = Number(args.supportTicketTrendPct);
    const npsLatest = Math.max(-100, Math.min(100, Number(args.npsLatest ?? 0)));
    const paymentLateDays = Math.max(
      0,
      Math.min(365, Number(args.paymentLateDays ?? 0)),
    );
    const daysSinceLastLogin = Math.max(
      0,
      Math.min(1825, Number(args.daysSinceLastLogin ?? 0)),
    );
    const alertThreshold = Math.max(
      1,
      Math.min(100, Number(args.alertThreshold ?? ALERT_DEFAULT_THRESHOLD)),
    );

    if (accountId.length < 1) {
      return { ok: false, refused: true, reason: "accountId required." };
    }
    if (!Number.isFinite(usageTrendPct)) {
      return { ok: false, refused: true, reason: "usageTrendPct invalid." };
    }
    if (!Number.isFinite(supportTicketTrendPct)) {
      return {
        ok: false,
        refused: true,
        reason: "supportTicketTrendPct invalid.",
      };
    }

    // Normalise each signal to a 0-100 "risk contribution".
    // Usage: a 30% drop counts as ~100; a flat-or-up trend is 0.
    const usageRisk = Math.max(0, Math.min(100, -usageTrendPct * (100 / 30)));
    // Support: +50% ticket volume = 100 risk; flat-or-down is 0.
    const supportRisk = Math.max(
      0,
      Math.min(100, supportTicketTrendPct * (100 / 50)),
    );
    // NPS: -100 = 100 risk; +100 = 0 risk.
    const npsRisk = Math.max(0, Math.min(100, (100 - npsLatest) / 2));
    // Payment late: 30 days late = 100 risk; 0 = 0.
    const paymentRisk = Math.max(
      0,
      Math.min(100, paymentLateDays * (100 / 30)),
    );
    // Login recency: 60 days inactive = 100 risk; 0 = 0.
    const loginRisk = Math.max(
      0,
      Math.min(100, daysSinceLastLogin * (100 / 60)),
    );

    const weights = {
      usageTrendPct: 0.3,
      supportTicketTrendPct: 0.2,
      npsLatest: 0.2,
      paymentLateDays: 0.15,
      daysSinceLastLogin: 0.15,
    };

    const contributingFactors = [
      {
        signal: "usageTrendPct",
        rawValue: usageTrendPct,
        normalisedRisk: Math.round(usageRisk),
        weight: weights.usageTrendPct,
        weightedContribution: Math.round(usageRisk * weights.usageTrendPct),
      },
      {
        signal: "supportTicketTrendPct",
        rawValue: supportTicketTrendPct,
        normalisedRisk: Math.round(supportRisk),
        weight: weights.supportTicketTrendPct,
        weightedContribution: Math.round(
          supportRisk * weights.supportTicketTrendPct,
        ),
      },
      {
        signal: "npsLatest",
        rawValue: npsLatest,
        normalisedRisk: Math.round(npsRisk),
        weight: weights.npsLatest,
        weightedContribution: Math.round(npsRisk * weights.npsLatest),
      },
      {
        signal: "paymentLateDays",
        rawValue: paymentLateDays,
        normalisedRisk: Math.round(paymentRisk),
        weight: weights.paymentLateDays,
        weightedContribution: Math.round(
          paymentRisk * weights.paymentLateDays,
        ),
      },
      {
        signal: "daysSinceLastLogin",
        rawValue: daysSinceLastLogin,
        normalisedRisk: Math.round(loginRisk),
        weight: weights.daysSinceLastLogin,
        weightedContribution: Math.round(
          loginRisk * weights.daysSinceLastLogin,
        ),
      },
    ].sort((a, b) => b.weightedContribution - a.weightedContribution);

    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          contributingFactors.reduce(
            (s, f) => s + f.weightedContribution,
            0,
          ),
        ),
      ),
    );

    const isAlert = score >= alertThreshold;
    const isHighRisk = score >= HIGH_RISK_THRESHOLD;

    await logSecurityEvent({
      kind: "renewal.churn.scored",
      tenantId: ctx.tenantId,
      payload: {
        subject: "renewal.churn.scored",
        accountId,
        score,
        isAlert,
        isHighRisk,
        topFactor: contributingFactors[0]?.signal,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        accountId,
        score,
        isAlert,
        isHighRisk,
        alertThreshold,
        highRiskThreshold: HIGH_RISK_THRESHOLD,
        contributingFactors,
        signals: {
          usageTrendPct,
          supportTicketTrendPct,
          npsLatest,
          paymentLateDays,
          daysSinceLastLogin,
        },
      },
    };
  },
};
