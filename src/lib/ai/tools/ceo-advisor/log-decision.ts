import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * log_decision — append an entry to the operator's decision log so
 * the CEO Advisor can reference past decisions in future briefings
 * ("3 weeks ago you decided X; here's whether the outcome you
 * predicted played out").
 *
 * Stored in security_events (subject='ceo.decision.logged') today;
 * Sprint 90+ migrates to a dedicated decisions table with separate
 * outcomes tracking + a CEO-side UI.
 */

const OUTCOME_TYPES = ["pending", "succeeded", "failed", "mixed", "abandoned"] as const;
const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;

export const logDecisionTool: Tool = {
  name: "log_decision",
  description:
    "Record a strategic decision the operator just made: what they chose, why, the alternatives considered, and the success criteria. The Advisor pulls these in future briefings to track which calls paid off. ALWAYS log decisions surfaced via frame_weekly_decisions when the operator commits to one.",
  parameters: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description: "What is the decision about? ≤10 words.",
      },
      decision: {
        type: "string",
        description: "What did the operator decide? 1-2 sentences.",
      },
      rationale: {
        type: "string",
        description: "Why this option and not the others? ≤200 words.",
      },
      alternatives: {
        type: "array",
        description: "Other options considered (and rejected). Each ≤20 words.",
        items: { type: "string" },
      },
      successCriteria: {
        type: "string",
        description:
          "How will the operator know if this decision was right in 30/90 days? Be specific.",
      },
      confidence: {
        type: "string",
        description: "How confident is the operator in this decision?",
        enum: CONFIDENCE_LEVELS,
      },
      reviewByIso: {
        type: "string",
        description:
          "ISO 8601 date the Advisor should resurface this decision for review. Default: 30 days out.",
      },
    },
    required: ["topic", "decision", "rationale", "successCriteria"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const topic = String(args.topic).trim();
    const decision = String(args.decision).trim();
    const rationale = String(args.rationale).trim();
    const alternatives = Array.isArray(args.alternatives)
      ? (args.alternatives as string[]).filter((s) => typeof s === "string" && s.length > 0)
      : [];
    const successCriteria = String(args.successCriteria).trim();
    const confidenceRaw = (args.confidence as string | undefined)?.toLowerCase();
    const confidence =
      confidenceRaw && (CONFIDENCE_LEVELS as readonly string[]).includes(confidenceRaw)
        ? confidenceRaw
        : "medium";

    if (topic.length < 3) {
      return { ok: false, refused: true, reason: "topic too short." };
    }
    if (decision.length < 10) {
      return { ok: false, refused: true, reason: "decision too short — describe what was chosen." };
    }
    if (rationale.length < 10) {
      return { ok: false, refused: true, reason: "rationale too short." };
    }
    if (successCriteria.length < 10) {
      return {
        ok: false,
        refused: true,
        reason: "successCriteria too short — specify how you'll measure outcome.",
      };
    }

    let reviewByIso: string;
    if (args.reviewByIso) {
      const parsed = Date.parse(String(args.reviewByIso));
      if (!Number.isFinite(parsed)) {
        return {
          ok: false,
          refused: true,
          reason: "reviewByIso is not a valid ISO date.",
        };
      }
      reviewByIso = new Date(parsed).toISOString();
    } else {
      reviewByIso = new Date(Date.now() + 30 * 86400_000).toISOString();
    }

    void OUTCOME_TYPES; // outcomes recorded by future update_decision tool

    try {
      await logSecurityEvent({
        kind: "ceo.decision.logged",
        tenantId: ctx.tenantId,
        payload: {
          subject: "ceo.decision.logged",
          topic,
          decision,
          rationale,
          alternatives,
          successCriteria,
          confidence,
          reviewByIso,
          outcome: "pending",
          workerId: ctx.workerId,
        },
      });
      return {
        ok: true,
        data: {
          logged: true,
          topic,
          confidence,
          reviewByIso,
          alternativesCount: alternatives.length,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't write decision log: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
