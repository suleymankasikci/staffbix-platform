import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * evaluate_escalation — decide the right tier-2 action for an
 * escalated ticket. Deterministic rules engine:
 *   - 'escalate_legal' if any of: legal threat detected, regulator
 *     mentioned, GDPR/SCC reference, lawyer mentioned
 *   - 'escalate_tier3' if amountAtStakeUsd > refundAuthorityUsd OR
 *     issueType in ('data_integrity', 'security_concern')
 *   - 'refund_within_authority' if amountAtStakeUsd ≤ refundAuthorityUsd
 *     AND customerLifetimeValueUsd ≥ ltvThreshold
 *   - 'discount_to_save' if churnIntent==true AND saveAuthorityPct ≥ 1
 *   - 'resolve_now' otherwise
 *
 * Output: recommendedAction + reasons[] + appliedCaps + escalateTags.
 */

const ISSUE_TYPES = [
  "billing",
  "shipping",
  "product_quality",
  "account_access",
  "feature_request",
  "data_integrity",
  "security_concern",
  "other",
] as const;

const LEGAL_PATTERNS = [
  /\blawyer\b/i,
  /\battorney\b/i,
  /\bregulator\w*/i,
  /\bgdpr\b/i,
  /\b(?:ccpa|hipaa|sox|pci dss)\b/i,
  /\bclass[\s-]?action\b/i,
  /\bsue\b/i,
  /\blegal action\b/i,
];

export const evaluateEscalationTool: Tool = {
  name: "evaluate_escalation",
  description:
    "Decide the right tier-2 action for an escalation. Hard server-side enforcement of refund authority + legal patterns. Pure rules — no LLM.",
  parameters: {
    type: "object",
    properties: {
      ticketId: { type: "string" },
      issueType: { type: "string", enum: ISSUE_TYPES },
      issueSummary: {
        type: "string",
        description: "Free-form summary. ≤2000 chars. Scanned for legal patterns.",
      },
      amountAtStakeUsd: {
        type: "number",
        description: "Refund amount the customer is asking for (USD).",
        minimum: 0,
        maximum: 1_000_000,
      },
      customerLifetimeValueUsd: {
        type: "number",
        description: "Estimated LTV in USD. 0 if unknown.",
        minimum: 0,
        maximum: 100_000_000,
      },
      churnIntent: {
        type: "boolean",
        description: "Did the customer signal they may leave?",
      },
      refundAuthorityUsd: {
        type: "number",
        description: "Tier-2 refund authority cap. Default 300.",
        minimum: 0,
        maximum: 50_000,
      },
      saveAuthorityPct: {
        type: "integer",
        description: "Save discount % the rep can offer without approval. Default 25.",
        minimum: 0,
        maximum: 50,
      },
      ltvThresholdUsd: {
        type: "number",
        description: "LTV threshold to invest a refund. Default 500.",
        minimum: 0,
      },
    },
    required: ["ticketId", "issueType", "issueSummary"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const ticketId = String(args.ticketId).trim();
    const issueType = String(args.issueType);
    const issueSummary = String(args.issueSummary).trim();
    const amountAtStakeUsd = Math.max(0, Number(args.amountAtStakeUsd ?? 0));
    const ltv = Math.max(0, Number(args.customerLifetimeValueUsd ?? 0));
    const churnIntent = Boolean(args.churnIntent);
    const refundAuthorityUsd = Math.max(
      0,
      Math.min(50_000, Number(args.refundAuthorityUsd ?? 300)),
    );
    const saveAuthorityPct = Math.max(
      0,
      Math.min(50, Math.round(Number(args.saveAuthorityPct ?? 25))),
    );
    const ltvThresholdUsd = Math.max(
      0,
      Number(args.ltvThresholdUsd ?? 500),
    );

    if (ticketId.length < 1) {
      return { ok: false, refused: true, reason: "ticketId required." };
    }
    if (!(ISSUE_TYPES as readonly string[]).includes(issueType)) {
      return {
        ok: false,
        refused: true,
        reason: `issueType must be one of: ${ISSUE_TYPES.join(", ")}`,
      };
    }
    if (issueSummary.length < 20 || issueSummary.length > 2000) {
      return {
        ok: false,
        refused: true,
        reason: "issueSummary must be 20-2000 chars.",
      };
    }

    const legalHits = LEGAL_PATTERNS.filter((re) => re.test(issueSummary));
    const escalateTags: string[] = [];
    if (legalHits.length > 0) escalateTags.push("legal_pattern");
    if (issueType === "data_integrity") escalateTags.push("data_integrity");
    if (issueType === "security_concern") escalateTags.push("security_concern");
    if (amountAtStakeUsd > refundAuthorityUsd)
      escalateTags.push("over_refund_authority");

    let recommendedAction:
      | "resolve_now"
      | "discount_to_save"
      | "refund_within_authority"
      | "escalate_tier3"
      | "escalate_legal" = "resolve_now";
    const reasons: string[] = [];

    if (legalHits.length > 0) {
      recommendedAction = "escalate_legal";
      reasons.push(
        `Legal pattern detected: ${legalHits.map((re) => String(re)).join(", ")}`,
      );
    } else if (
      issueType === "data_integrity" ||
      issueType === "security_concern"
    ) {
      recommendedAction = "escalate_tier3";
      reasons.push(
        `issueType '${issueType}' requires tier-3 / engineering review.`,
      );
    } else if (amountAtStakeUsd > refundAuthorityUsd) {
      recommendedAction = "escalate_tier3";
      reasons.push(
        `amountAtStakeUsd (${amountAtStakeUsd}) > refundAuthorityUsd (${refundAuthorityUsd}).`,
      );
    } else if (
      amountAtStakeUsd > 0 &&
      amountAtStakeUsd <= refundAuthorityUsd &&
      ltv >= ltvThresholdUsd
    ) {
      recommendedAction = "refund_within_authority";
      reasons.push(
        `Refund of $${amountAtStakeUsd} is within authority and LTV ($${ltv}) ≥ threshold ($${ltvThresholdUsd}).`,
      );
    } else if (churnIntent && saveAuthorityPct >= 1) {
      recommendedAction = "discount_to_save";
      reasons.push(
        `Churn intent flagged — offer up to ${saveAuthorityPct}% discount within authority.`,
      );
    } else {
      reasons.push("No escalation triggers fired — handle inline.");
    }

    const appliedCaps = {
      refundAuthorityUsd,
      saveAuthorityPct,
      ltvThresholdUsd,
    };

    await logSecurityEvent({
      kind: "tier2.escalation.evaluated",
      tenantId: ctx.tenantId,
      payload: {
        subject: "tier2.escalation.evaluated",
        ticketId,
        issueType,
        recommendedAction,
        amountAtStakeUsd,
        escalateTagsCount: escalateTags.length,
        legalDetected: legalHits.length > 0,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        ticketId,
        issueType,
        recommendedAction,
        reasons,
        escalateTags,
        appliedCaps,
        signals: {
          amountAtStakeUsd,
          customerLifetimeValueUsd: ltv,
          churnIntent,
          legalPatternHits: legalHits.length,
        },
      },
    };
  },
};
