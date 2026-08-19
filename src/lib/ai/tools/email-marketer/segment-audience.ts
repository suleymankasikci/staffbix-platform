import { and, eq, sql, gte } from "drizzle-orm";
import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";

/**
 * segment_audience — return a count + sample of leads that match a
 * set of filters. Used by the Email Marketer to size a campaign
 * BEFORE drafting it.
 *
 * Filters target the leads table because that's where existing
 * tenant prospect/customer records live (qualified by inbound-sales
 * or created by SDR). Future Sprint 30+ will broaden this to the
 * customer-onboarder pipeline + tenant CRM exports.
 *
 * Returns:
 *   - total count of matching leads
 *   - up to `samplePreview` leads (default 5) for the operator to
 *     sanity-check
 *
 * The model must NOT use this to leak a full leads export — the
 * `samplePreview` cap is fixed at 25.
 */

const MAX_PREVIEW = 25;

export const segmentAudienceTool: Tool = {
  name: "segment_audience",
  description:
    "Count + preview leads that match a set of filters BEFORE sending a campaign. Returns total + up to 25 sample rows so you can confirm the audience shape with the operator.",
  parameters: {
    type: "object",
    properties: {
      status: {
        type: "string",
        description:
          "Lead status filter — 'new', 'queued', 'contacted', 'won', 'lost'. Omit to include all.",
        enum: ["new", "queued", "contacted", "won", "lost"],
      },
      tags: {
        type: "array",
        description: "Only leads that include ALL these tags.",
        items: { type: "string" },
      },
      minQualificationScore: {
        type: "integer",
        description: "Only leads whose metadata.qualificationScore is at or above this value (0-100).",
        minimum: 0,
        maximum: 100,
      },
      contactedWithinDays: {
        type: "integer",
        description:
          "Only leads whose lastContactedAt is within this many days (use 0 to mean 'never contacted').",
        minimum: 0,
        maximum: 365,
      },
      samplePreview: {
        type: "integer",
        description: "How many sample leads to return for sanity check (1-25).",
        minimum: 1,
        maximum: MAX_PREVIEW,
      },
    },
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const status = args.status ? String(args.status) : null;
    const tags = Array.isArray(args.tags) ? (args.tags as string[]).filter(Boolean) : [];
    const minScore =
      typeof args.minQualificationScore === "number"
        ? Math.max(0, Math.min(100, args.minQualificationScore))
        : null;
    const contactedWithinDays =
      typeof args.contactedWithinDays === "number"
        ? Math.max(0, Math.min(365, args.contactedWithinDays))
        : null;
    const samplePreview = Math.max(
      1,
      Math.min(MAX_PREVIEW, Number(args.samplePreview ?? 5)),
    );

    try {
      // Build WHERE clauses dynamically. Always scope by tenant.
      const clauses = [eq(leads.tenantId, ctx.tenantId)];
      if (status) {
        clauses.push(eq(leads.status, status as typeof leads.$inferSelect.status));
      }
      if (minScore !== null) {
        // metadata is jsonb; cast the field to int. Drizzle doesn't
        // have a typed helper for this so use a raw expression.
        clauses.push(
          sql`COALESCE((${leads.metadata}->>'qualificationScore')::int, 0) >= ${minScore}`,
        );
      }
      if (tags.length > 0) {
        // leads.tags is text[]; the @> operator checks "contains all".
        // Postgres needs an explicit text[] cast; build the literal so
        // postgres-js doesn't infer the wrong type.
        const arrayLiteral = sql.raw(
          `ARRAY[${tags.map((t) => `'${t.replace(/'/g, "''")}'`).join(",")}]::text[]`,
        );
        clauses.push(sql`${leads.tags} @> ${arrayLiteral}`);
      }
      if (contactedWithinDays !== null) {
        if (contactedWithinDays === 0) {
          clauses.push(sql`${leads.lastContactedAt} IS NULL`);
        } else {
          const cutoff = new Date(Date.now() - contactedWithinDays * 86400_000);
          clauses.push(gte(leads.lastContactedAt, cutoff));
        }
      }

      const where = and(...clauses);

      const countRows = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(leads)
        .where(where);
      const total = Number(countRows[0]?.c ?? 0);

      const sample = await db
        .select({
          id: leads.id,
          email: leads.email,
          name: leads.name,
          company: leads.company,
          status: leads.status,
          tags: leads.tags,
        })
        .from(leads)
        .where(where)
        .limit(samplePreview);

      return {
        ok: true,
        data: {
          total,
          sample,
          filters: { status, tags, minScore, contactedWithinDays, samplePreview },
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Segment query failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
