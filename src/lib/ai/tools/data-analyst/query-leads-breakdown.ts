import { and, eq, sql, gte } from "drizzle-orm";
import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";

/**
 * query_leads_breakdown — count + group leads by a chosen dimension
 * (status, source, or tag) over an optional time window. Read-only;
 * no arbitrary SQL — the field whitelist + LIMIT cap make this safe to
 * expose to the model.
 *
 * Used by Data Analyst + CEO Advisor + Business Analyst to answer
 * "how many leads in each stage?" and "where are most leads coming
 * from this month?" without writing SQL.
 */

const DIMENSIONS = ["status", "source", "tag"] as const;

export const queryLeadsBreakdownTool: Tool = {
  name: "query_leads_breakdown",
  description:
    "Count leads grouped by status, source, or tag (read-only). Returns up to 20 buckets sorted descending by count. Optional date window applies to lead creation time.",
  parameters: {
    type: "object",
    properties: {
      groupBy: {
        type: "string",
        enum: DIMENSIONS,
        description: "Which dimension to group by.",
      },
      windowDays: {
        type: "integer",
        description:
          "Limit to leads created in the last N days. 0 = all-time. Default 30.",
        minimum: 0,
        maximum: 730,
      },
    },
    required: ["groupBy"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const groupBy = String(args.groupBy);
    const windowDays = Math.max(0, Math.min(730, Number(args.windowDays ?? 30)));

    if (!(DIMENSIONS as readonly string[]).includes(groupBy)) {
      return {
        ok: false,
        refused: true,
        reason: `groupBy must be one of: ${DIMENSIONS.join(", ")}`,
      };
    }

    try {
      const clauses = [eq(leads.tenantId, ctx.tenantId)];
      if (windowDays > 0) {
        const cutoff = new Date(Date.now() - windowDays * 86400_000);
        clauses.push(gte(leads.createdAt, cutoff));
      }
      const where = and(...clauses);

      let buckets: Array<{ bucket: string; count: number }>;

      if (groupBy === "status") {
        const rows = await db
          .select({
            bucket: leads.status,
            count: sql<number>`count(*)::int`,
          })
          .from(leads)
          .where(where)
          .groupBy(leads.status)
          .limit(20);
        buckets = rows.map((r) => ({ bucket: String(r.bucket ?? "unknown"), count: r.count }));
      } else if (groupBy === "source") {
        const rows = await db
          .select({
            bucket: sql<string>`COALESCE(${leads.source}, 'unknown')`,
            count: sql<number>`count(*)::int`,
          })
          .from(leads)
          .where(where)
          .groupBy(leads.source)
          .limit(20);
        buckets = rows.map((r) => ({ bucket: String(r.bucket ?? "unknown"), count: r.count }));
      } else {
        // groupBy === "tag" — unnest the text[] then count
        const rows = await db.execute<{ bucket: string; count: number }>(sql`
          SELECT tag AS bucket, COUNT(*)::int AS count
          FROM ${leads}, unnest(${leads.tags}) AS tag
          WHERE ${where}
          GROUP BY tag
          ORDER BY count DESC
          LIMIT 20
        `);
        buckets = [...rows].map((r) => ({ bucket: String(r.bucket), count: Number(r.count) }));
      }

      // Sort descending by count
      buckets.sort((a, b) => b.count - a.count);

      const total = buckets.reduce((s, b) => s + b.count, 0);
      return {
        ok: true,
        data: {
          groupBy,
          windowDays,
          total,
          buckets,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Query failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
