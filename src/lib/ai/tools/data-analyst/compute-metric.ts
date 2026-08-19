import { and, eq, gte, sql } from "drizzle-orm";
import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { leads, securityEvents, aiUsage } from "@/lib/db/schema";

/**
 * compute_metric — fetch a single named KPI over a window. Whitelisted
 * metric names + read-only SQL guarantee safety. The Data Analyst /
 * Business Analyst / CEO Advisor call this to ground numerical claims
 * in their replies.
 *
 * Supported metrics:
 *   - lead_count: total leads
 *   - lead_qualified_count: leads with metadata.qualificationScore >=
 *     threshold (default 60)
 *   - lead_conversion_rate: % of leads with status in
 *     ('contacted','replied','qualified')
 *   - meeting_count: # of leads that have any entry in
 *     metadata.meetings[]
 *   - average_qualification_score: average across all qualified leads
 *   - bookkeeping_net_cents: income − expense from security_events
 *     ledger
 *   - ai_usage_cost_microcents: sum cost_microcents from ai_usage
 *   - ai_call_count: number of ai_usage rows
 */

const METRICS = [
  "lead_count",
  "lead_qualified_count",
  "lead_conversion_rate",
  "meeting_count",
  "average_qualification_score",
  "bookkeeping_net_cents",
  "ai_usage_cost_microcents",
  "ai_call_count",
] as const;

export const computeMetricTool: Tool = {
  name: "compute_metric",
  description:
    "Compute a single named business metric over a time window. Returns the numeric value + supporting count. Use this BEFORE quoting any number in your reply — speculation is forbidden.",
  parameters: {
    type: "object",
    properties: {
      metric: {
        type: "string",
        enum: METRICS,
      },
      windowDays: {
        type: "integer",
        description: "Trailing window in days. 0 = all-time. Default 30.",
        minimum: 0,
        maximum: 730,
      },
      qualificationThreshold: {
        type: "integer",
        description:
          "For lead_qualified_count: minimum metadata.qualificationScore. Default 60.",
        minimum: 0,
        maximum: 100,
      },
    },
    required: ["metric"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const metric = String(args.metric);
    const windowDays = Math.max(0, Math.min(730, Number(args.windowDays ?? 30)));
    const qualificationThreshold = Math.max(
      0,
      Math.min(100, Number(args.qualificationThreshold ?? 60)),
    );

    if (!(METRICS as readonly string[]).includes(metric)) {
      return {
        ok: false,
        refused: true,
        reason: `metric must be one of: ${METRICS.join(", ")}`,
      };
    }

    const cutoff =
      windowDays > 0 ? new Date(Date.now() - windowDays * 86400_000) : null;

    try {
      const tenantClause = eq(leads.tenantId, ctx.tenantId);

      switch (metric) {
        case "lead_count": {
          const where = cutoff
            ? and(tenantClause, gte(leads.createdAt, cutoff))
            : tenantClause;
          const rows = await db
            .select({ c: sql<number>`count(*)::int` })
            .from(leads)
            .where(where);
          return {
            ok: true,
            data: { metric, value: Number(rows[0]?.c ?? 0), windowDays },
          };
        }
        case "lead_qualified_count": {
          const baseClauses = [tenantClause];
          if (cutoff) baseClauses.push(gte(leads.createdAt, cutoff));
          baseClauses.push(
            sql`COALESCE((${leads.metadata}->>'qualificationScore')::int, 0) >= ${qualificationThreshold}`,
          );
          const rows = await db
            .select({ c: sql<number>`count(*)::int` })
            .from(leads)
            .where(and(...baseClauses));
          return {
            ok: true,
            data: {
              metric,
              value: Number(rows[0]?.c ?? 0),
              qualificationThreshold,
              windowDays,
            },
          };
        }
        case "lead_conversion_rate": {
          const baseClauses = [tenantClause];
          if (cutoff) baseClauses.push(gte(leads.createdAt, cutoff));
          const totalRows = await db
            .select({ c: sql<number>`count(*)::int` })
            .from(leads)
            .where(and(...baseClauses));
          const convRows = await db
            .select({ c: sql<number>`count(*)::int` })
            .from(leads)
            .where(
              and(
                ...baseClauses,
                sql`${leads.status} IN ('contacted','replied','qualified')`,
              ),
            );
          const total = Number(totalRows[0]?.c ?? 0);
          const converted = Number(convRows[0]?.c ?? 0);
          const rate = total > 0 ? Number((converted / total).toFixed(4)) : 0;
          return {
            ok: true,
            data: {
              metric,
              value: rate,
              total,
              converted,
              windowDays,
            },
          };
        }
        case "meeting_count": {
          const baseClauses = [tenantClause];
          if (cutoff) baseClauses.push(gte(leads.createdAt, cutoff));
          baseClauses.push(
            sql`jsonb_array_length(COALESCE(${leads.metadata}->'meetings', '[]'::jsonb)) > 0`,
          );
          const rows = await db
            .select({ c: sql<number>`count(*)::int` })
            .from(leads)
            .where(and(...baseClauses));
          return {
            ok: true,
            data: { metric, value: Number(rows[0]?.c ?? 0), windowDays },
          };
        }
        case "average_qualification_score": {
          const baseClauses = [
            tenantClause,
            sql`(${leads.metadata}->>'qualificationScore') IS NOT NULL`,
          ];
          if (cutoff) baseClauses.push(gte(leads.createdAt, cutoff));
          const rows = await db
            .select({
              avgScore: sql<string>`AVG((${leads.metadata}->>'qualificationScore')::int)::text`,
              c: sql<number>`count(*)::int`,
            })
            .from(leads)
            .where(and(...baseClauses));
          const avg = Number(rows[0]?.avgScore ?? 0);
          return {
            ok: true,
            data: {
              metric,
              value: Number.isFinite(avg) ? Number(avg.toFixed(2)) : 0,
              qualifiedLeads: Number(rows[0]?.c ?? 0),
              windowDays,
            },
          };
        }
        case "bookkeeping_net_cents": {
          const seClauses = [eq(securityEvents.tenantId, ctx.tenantId)];
          if (cutoff) seClauses.push(gte(securityEvents.createdAt, cutoff));
          seClauses.push(
            sql`(${securityEvents.payload}->>'subject') = 'bookkeeping.entry'`,
          );
          const rows = await db
            .select({
              entryType: sql<string>`(${securityEvents.payload}->>'entryType')`,
              total: sql<string>`SUM((${securityEvents.payload}->>'amountCents')::bigint)::text`,
            })
            .from(securityEvents)
            .where(and(...seClauses))
            .groupBy(sql`(${securityEvents.payload}->>'entryType')`);
          let income = 0;
          let expense = 0;
          for (const r of rows) {
            if (r.entryType === "income") income = Number(r.total ?? 0);
            else if (r.entryType === "expense") expense = Number(r.total ?? 0);
          }
          return {
            ok: true,
            data: {
              metric,
              value: income - expense,
              income,
              expense,
              windowDays,
            },
          };
        }
        case "ai_usage_cost_microcents": {
          const auClauses = [eq(aiUsage.tenantId, ctx.tenantId)];
          if (cutoff) auClauses.push(gte(aiUsage.createdAt, cutoff));
          const rows = await db
            .select({
              total: sql<string>`COALESCE(SUM(${aiUsage.costMicrocents}), 0)::text`,
            })
            .from(aiUsage)
            .where(and(...auClauses));
          return {
            ok: true,
            data: {
              metric,
              value: Number(rows[0]?.total ?? 0),
              windowDays,
            },
          };
        }
        case "ai_call_count": {
          const auClauses = [eq(aiUsage.tenantId, ctx.tenantId)];
          if (cutoff) auClauses.push(gte(aiUsage.createdAt, cutoff));
          const rows = await db
            .select({ c: sql<number>`count(*)::int` })
            .from(aiUsage)
            .where(and(...auClauses));
          return {
            ok: true,
            data: { metric, value: Number(rows[0]?.c ?? 0), windowDays },
          };
        }
      }
      // Unreachable due to switch, but TS wants a fallback:
      return { ok: false, refused: true, reason: "Unknown metric" };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Metric computation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
