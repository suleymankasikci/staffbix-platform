import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { leads, securityEvents, aiUsage } from "@/lib/db/schema";

/**
 * compare_period_metric — compare a single named metric across two
 * contiguous time windows. Returns current value, previous value, the
 * absolute delta, and the percentage change. Flags the change as an
 * "anomaly" when |pctChange| crosses the configurable threshold
 * (default 20%, matching the Business Analyst role-config default).
 *
 * Supported metrics (subset of compute_metric — only those that make
 * sense across a delimited window):
 *   - lead_count
 *   - lead_qualified_count
 *   - bookkeeping_net_cents
 *   - bookkeeping_income_cents
 *   - bookkeeping_expense_cents
 *   - ai_usage_cost_microcents
 *   - ai_call_count
 *
 * Why a separate tool from compute_metric:
 *   compute_metric takes a single "trailing N days" window. Business
 *   Analyst needs current vs. previous — two windows with explicit
 *   start + end. Combining them into one tool would muddy the
 *   semantics and the LLM would call it incorrectly.
 */

const METRICS = [
  "lead_count",
  "lead_qualified_count",
  "bookkeeping_net_cents",
  "bookkeeping_income_cents",
  "bookkeeping_expense_cents",
  "ai_usage_cost_microcents",
  "ai_call_count",
] as const;

async function computeMetricForRange(
  tenantId: string,
  metric: string,
  start: Date,
  end: Date,
  qualificationThreshold: number,
): Promise<number> {
  switch (metric) {
    case "lead_count": {
      const rows = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(leads)
        .where(
          and(
            eq(leads.tenantId, tenantId),
            gte(leads.createdAt, start),
            lt(leads.createdAt, end),
          ),
        );
      return Number(rows[0]?.c ?? 0);
    }
    case "lead_qualified_count": {
      const rows = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(leads)
        .where(
          and(
            eq(leads.tenantId, tenantId),
            gte(leads.createdAt, start),
            lt(leads.createdAt, end),
            sql`COALESCE((${leads.metadata}->>'qualificationScore')::int, 0) >= ${qualificationThreshold}`,
          ),
        );
      return Number(rows[0]?.c ?? 0);
    }
    case "bookkeeping_net_cents":
    case "bookkeeping_income_cents":
    case "bookkeeping_expense_cents": {
      const rows = await db
        .select({
          entryType: sql<string>`(${securityEvents.payload}->>'entryType')`,
          total: sql<string>`SUM((${securityEvents.payload}->>'amountCents')::bigint)::text`,
        })
        .from(securityEvents)
        .where(
          and(
            eq(securityEvents.tenantId, tenantId),
            gte(securityEvents.createdAt, start),
            lt(securityEvents.createdAt, end),
            sql`(${securityEvents.payload}->>'subject') = 'bookkeeping.entry'`,
          ),
        )
        .groupBy(sql`(${securityEvents.payload}->>'entryType')`);
      let income = 0;
      let expense = 0;
      for (const r of rows) {
        if (r.entryType === "income") income = Number(r.total ?? 0);
        else if (r.entryType === "expense") expense = Number(r.total ?? 0);
      }
      if (metric === "bookkeeping_income_cents") return income;
      if (metric === "bookkeeping_expense_cents") return expense;
      return income - expense;
    }
    case "ai_usage_cost_microcents": {
      const rows = await db
        .select({
          total: sql<string>`COALESCE(SUM(${aiUsage.costMicrocents}), 0)::text`,
        })
        .from(aiUsage)
        .where(
          and(
            eq(aiUsage.tenantId, tenantId),
            gte(aiUsage.createdAt, start),
            lt(aiUsage.createdAt, end),
          ),
        );
      return Number(rows[0]?.total ?? 0);
    }
    case "ai_call_count": {
      const rows = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(aiUsage)
        .where(
          and(
            eq(aiUsage.tenantId, tenantId),
            gte(aiUsage.createdAt, start),
            lt(aiUsage.createdAt, end),
          ),
        );
      return Number(rows[0]?.c ?? 0);
    }
  }
  return 0;
}

export const comparePeriodMetricTool: Tool = {
  name: "compare_period_metric",
  description:
    "Compare a metric across two contiguous time windows (current vs previous). Returns delta, % change, and an anomaly flag when |pctChange| crosses anomalyThresholdPct (default 20). Use this BEFORE recommending action — anomalies justify intervention, normal drift does not.",
  parameters: {
    type: "object",
    properties: {
      metric: { type: "string", enum: METRICS },
      windowDays: {
        type: "integer",
        description: "Length of the current window in days (also the previous window's length).",
        minimum: 1,
        maximum: 365,
      },
      previousWindowDays: {
        type: "integer",
        description:
          "Length of the previous window in days. Defaults to windowDays. Use a different value only when comparing dissimilar periods (e.g., last 7 days vs last 30 days).",
        minimum: 1,
        maximum: 365,
      },
      anomalyThresholdPct: {
        type: "integer",
        description: "|pctChange| above this is flagged as anomaly. Default 20.",
        minimum: 1,
        maximum: 200,
      },
      qualificationThreshold: {
        type: "integer",
        description: "For lead_qualified_count. Default 60.",
        minimum: 0,
        maximum: 100,
      },
    },
    required: ["metric", "windowDays"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const metric = String(args.metric);
    const windowDays = Math.max(1, Math.min(365, Number(args.windowDays ?? 7)));
    const previousWindowDays = Math.max(
      1,
      Math.min(365, Number(args.previousWindowDays ?? windowDays)),
    );
    const anomalyThresholdPct = Math.max(
      1,
      Math.min(200, Number(args.anomalyThresholdPct ?? 20)),
    );
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

    const now = new Date();
    const curEnd = now;
    const curStart = new Date(now.getTime() - windowDays * 86400_000);
    const prevEnd = curStart;
    const prevStart = new Date(prevEnd.getTime() - previousWindowDays * 86400_000);

    try {
      const [current, previous] = await Promise.all([
        computeMetricForRange(ctx.tenantId, metric, curStart, curEnd, qualificationThreshold),
        computeMetricForRange(ctx.tenantId, metric, prevStart, prevEnd, qualificationThreshold),
      ]);

      const delta = current - previous;
      const pctChange =
        previous === 0
          ? current === 0
            ? 0
            : null /* infinite — flag separately */
          : Number(((delta / Math.abs(previous)) * 100).toFixed(2));
      const anomaly =
        pctChange === null
          ? current > 0
          : Math.abs(pctChange) >= anomalyThresholdPct;
      const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

      return {
        ok: true,
        data: {
          metric,
          current,
          previous,
          delta,
          pctChange,
          direction,
          anomaly,
          anomalyThresholdPct,
          windowDays,
          previousWindowDays,
          currentWindow: { start: curStart.toISOString(), end: curEnd.toISOString() },
          previousWindow: { start: prevStart.toISOString(), end: prevEnd.toISOString() },
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Comparison failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
