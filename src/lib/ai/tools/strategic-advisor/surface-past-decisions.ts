import { and, eq, gte, sql, desc } from "drizzle-orm";
import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { securityEvents } from "@/lib/db/schema";

/**
 * surface_past_decisions — pull recently-logged ceo.decision.logged
 * entries from the security_events ledger. Used by Strategic Advisor
 * (and CEO Advisor) to remember what's already been decided so it can
 * flag contradictions before the operator commits to something new.
 *
 * Query knobs:
 *   - keyword (string): substring match on topic + decision + rationale
 *   - windowDays (int): trailing days. 0 = all-time. Default 180.
 *   - limit (int): max entries returned. 1-20. Default 10.
 */

const MAX_LIMIT = 20;

export const surfacePastDecisionsTool: Tool = {
  name: "surface_past_decisions",
  description:
    "Look up decisions the operator has logged previously (via log_decision). Use this BEFORE giving advice on a new decision so you can reference (or contradict) past choices. Returns most-recent first.",
  parameters: {
    type: "object",
    properties: {
      keyword: {
        type: "string",
        description:
          "Optional substring to match against topic + decision + rationale. Lowercase, no regex.",
      },
      windowDays: {
        type: "integer",
        description: "Trailing days. 0 = all-time. Default 180.",
        minimum: 0,
        maximum: 1825,
      },
      limit: {
        type: "integer",
        description: "Max decisions returned. Default 10, max 20.",
        minimum: 1,
        maximum: MAX_LIMIT,
      },
    },
    required: [],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const keyword = args.keyword ? String(args.keyword).trim().toLowerCase() : "";
    const windowDays = Math.max(0, Math.min(1825, Number(args.windowDays ?? 180)));
    const limit = Math.max(1, Math.min(MAX_LIMIT, Number(args.limit ?? 10)));

    const cutoff =
      windowDays > 0 ? new Date(Date.now() - windowDays * 86400_000) : null;

    try {
      const clauses = [
        eq(securityEvents.tenantId, ctx.tenantId),
        sql`(${securityEvents.payload}->>'subject') = 'ceo.decision.logged'`,
      ];
      if (cutoff) clauses.push(gte(securityEvents.createdAt, cutoff));
      if (keyword.length >= 2) {
        clauses.push(
          sql`(
            LOWER(COALESCE(${securityEvents.payload}->>'topic', '')) LIKE ${"%" + keyword + "%"}
            OR LOWER(COALESCE(${securityEvents.payload}->>'decision', '')) LIKE ${"%" + keyword + "%"}
            OR LOWER(COALESCE(${securityEvents.payload}->>'rationale', '')) LIKE ${"%" + keyword + "%"}
          )`,
        );
      }

      const rows = await db
        .select({
          createdAt: securityEvents.createdAt,
          payload: securityEvents.payload,
        })
        .from(securityEvents)
        .where(and(...clauses))
        .orderBy(desc(securityEvents.createdAt))
        .limit(limit);

      const decisions = rows.map((r) => {
        const p = (r.payload as Record<string, unknown>) ?? {};
        return {
          loggedAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
          topic: typeof p.topic === "string" ? p.topic : "",
          decision: typeof p.decision === "string" ? p.decision : "",
          rationale: typeof p.rationale === "string" ? p.rationale : "",
          alternatives: Array.isArray(p.alternatives) ? (p.alternatives as string[]) : [],
          successCriteria:
            typeof p.successCriteria === "string" ? p.successCriteria : "",
          confidence: typeof p.confidence === "string" ? p.confidence : "medium",
          reviewByIso: typeof p.reviewByIso === "string" ? p.reviewByIso : null,
          outcome: typeof p.outcome === "string" ? p.outcome : "pending",
        };
      });

      return {
        ok: true,
        data: {
          count: decisions.length,
          windowDays,
          keyword: keyword || null,
          decisions,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Decision lookup failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
