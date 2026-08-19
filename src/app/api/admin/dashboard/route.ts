import { NextResponse } from "next/server";
import { and, desc, eq, inArray, sql, notInArray, count } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  tenants,
  plans,
  platformInvoices,
  supportTickets,
  securityEvents,
  users,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/dashboard
 *
 * One-shot payload powering the platform overview page. Combines KPI
 * totals with five "recent activity" feeds. Each feed is capped at 10
 * rows — anything larger belongs on its own dedicated page.
 *
 * Why a single endpoint rather than five: the dashboard is the entry
 * point after staff login and we don't want a six-roundtrip waterfall
 * the moment the panel opens. Cost is one trip; payload stays small.
 */

export async function GET(): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "GET /api/admin/dashboard",
  });
  if (t) return t;

  // KPI totals — four cheap aggregates.
  const [tenantTotalRow] = await db
    .select({ c: count(tenants.id) })
    .from(tenants);

  const [activeTenantsRow] = await db
    .select({ c: count(tenants.id) })
    .from(tenants)
    .where(inArray(tenants.status, ["active", "trialing"]));

  const [mrrRow] = await db
    .select({
      sum: sql<number>`coalesce(sum(${plans.priceMonthlyCents}), 0)`,
    })
    .from(tenants)
    .innerJoin(plans, eq(plans.id, tenants.planId))
    .where(eq(tenants.status, "active"));

  const [openTicketsRow] = await db
    .select({ c: count(supportTickets.id) })
    .from(supportTickets)
    .where(notInArray(supportTickets.status, ["resolved", "closed"]));

  // Recent signups — last 10 tenants by createdAt.
  const recentSignups = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      planId: tenants.planId,
      planName: plans.name,
      status: tenants.status,
      country: tenants.country,
      createdAt: tenants.createdAt,
    })
    .from(tenants)
    .innerJoin(plans, eq(plans.id, tenants.planId))
    .orderBy(desc(tenants.createdAt))
    .limit(10);

  // Recent invoices — last 10 with tenant name.
  const recentInvoiceRows = await db
    .select({
      id: platformInvoices.id,
      tenantId: platformInvoices.tenantId,
      tenantName: tenants.name,
      planId: platformInvoices.planId,
      amountCents: platformInvoices.amountCents,
      currency: platformInvoices.currency,
      status: platformInvoices.status,
      issuedAt: platformInvoices.issuedAt,
      paidAt: platformInvoices.paidAt,
    })
    .from(platformInvoices)
    .innerJoin(tenants, eq(tenants.id, platformInvoices.tenantId))
    .orderBy(desc(platformInvoices.issuedAt))
    .limit(10);

  // Recent tickets — last 10 with tenant name.
  const recentTicketRows = await db
    .select({
      id: supportTickets.id,
      code: supportTickets.code,
      tenantId: supportTickets.tenantId,
      tenantName: tenants.name,
      subject: supportTickets.subject,
      priority: supportTickets.priority,
      status: supportTickets.status,
      channel: supportTickets.channel,
      reporterName: supportTickets.reporterName,
      reporterEmail: supportTickets.reporterEmail,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
    })
    .from(supportTickets)
    .innerJoin(tenants, eq(tenants.id, supportTickets.tenantId))
    .orderBy(desc(supportTickets.updatedAt))
    .limit(10);

  // Recent audit events — last 10 with tenant name + user name (both
  // nullable on the row, since events can be tenantless / userless).
  const recentAuditRows = await db
    .select({
      id: securityEvents.id,
      kind: securityEvents.kind,
      createdAt: securityEvents.createdAt,
      ip: securityEvents.ip,
      tenantId: securityEvents.tenantId,
      tenantName: tenants.name,
      userId: securityEvents.userId,
      userName: users.name,
      payload: securityEvents.payload,
    })
    .from(securityEvents)
    .leftJoin(tenants, eq(tenants.id, securityEvents.tenantId))
    .leftJoin(users, eq(users.id, securityEvents.userId))
    .orderBy(desc(securityEvents.createdAt))
    .limit(10);

  // ── Trend series ────────────────────────────────────────────────────
  // Two aggregates: MRR over the last 7 ISO weeks (paid invoice totals
  // grouped by week-start), and signups for the last 7 calendar days.
  // Both anchored to UTC to keep weekday labels stable across the staff
  // timezone.
  const sevenWeeksAgo = new Date(Date.now() - 7 * 7 * 86400_000);
  const mrrRows = await db.execute<{
    bucket: string;
    sum_cents: number;
  }>(sql`
    SELECT
      to_char(date_trunc('week', ${platformInvoices.paidAt}), 'YYYY-MM-DD') AS bucket,
      COALESCE(SUM(${platformInvoices.amountCents})::int, 0) AS sum_cents
    FROM ${platformInvoices}
    WHERE ${platformInvoices.status} = 'paid'
      AND ${platformInvoices.paidAt} IS NOT NULL
      AND ${platformInvoices.paidAt} >= ${sevenWeeksAgo.toISOString()}::timestamptz
    GROUP BY 1
    ORDER BY 1 ASC
  `);

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000);
  const signupRows = await db.execute<{
    bucket: string;
    cnt: number;
  }>(sql`
    SELECT
      to_char(date_trunc('day', ${tenants.createdAt}), 'YYYY-MM-DD') AS bucket,
      COUNT(*)::int AS cnt
    FROM ${tenants}
    WHERE ${tenants.createdAt} >= ${sevenDaysAgo.toISOString()}::timestamptz
    GROUP BY 1
    ORDER BY 1 ASC
  `);

  // Plan mix: per-plan active-tenant count + total MRR contribution.
  const planMixRows = await db
    .select({
      planId: plans.id,
      planName: plans.name,
      priceMonthlyCents: plans.priceMonthlyCents,
      tenantCount: sql<number>`count(${tenants.id})::int`,
    })
    .from(plans)
    .leftJoin(
      tenants,
      and(eq(tenants.planId, plans.id), eq(tenants.status, "active")),
    )
    .groupBy(plans.id, plans.name, plans.priceMonthlyCents, plans.sortOrder)
    .orderBy(plans.sortOrder);
  const totalPaidTenants = planMixRows.reduce(
    (sum, row) => sum + Number(row.tenantCount),
    0,
  );

  return NextResponse.json({
    totals: {
      tenants: Number(tenantTotalRow?.c ?? 0),
      activeTenants: Number(activeTenantsRow?.c ?? 0),
      mrrCents: Number(mrrRow?.sum ?? 0),
      openTickets: Number(openTicketsRow?.c ?? 0),
    },
    mrrTrend: mrrRows.map((r) => ({
      bucket: r.bucket,
      valueCents: Number(r.sum_cents),
    })),
    signupsTrend: signupRows.map((r) => ({
      bucket: r.bucket,
      value: Number(r.cnt),
    })),
    planMix: planMixRows.map((r) => {
      const count = Number(r.tenantCount);
      const mrrCents = count * Number(r.priceMonthlyCents);
      return {
        planId: r.planId,
        planName: r.planName,
        count,
        mrrCents,
        pct:
          totalPaidTenants > 0
            ? Math.round((count / totalPaidTenants) * 100)
            : 0,
      };
    }),
    recentSignups: recentSignups.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      planId: t.planId,
      planName: t.planName,
      status: t.status,
      country: t.country,
      createdAt: t.createdAt.toISOString(),
    })),
    recentInvoices: recentInvoiceRows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      tenantName: r.tenantName,
      planId: r.planId,
      amountCents: r.amountCents,
      currency: r.currency,
      status: r.status,
      issuedAt: r.issuedAt?.toISOString() ?? null,
      paidAt: r.paidAt?.toISOString() ?? null,
    })),
    recentTickets: recentTicketRows.map((r) => ({
      id: r.id,
      code: r.code,
      tenantId: r.tenantId,
      tenantName: r.tenantName,
      subject: r.subject,
      priority: r.priority,
      status: r.status,
      channel: r.channel,
      reporterName: r.reporterName ?? r.reporterEmail,
      reporterEmail: r.reporterEmail,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    recentAudit: recentAuditRows.map((r) => ({
      id: r.id,
      kind: r.kind,
      createdAt: r.createdAt.toISOString(),
      ip: r.ip,
      tenantId: r.tenantId,
      tenantName: r.tenantName,
      userId: r.userId,
      userName: r.userName,
      payload: r.payload,
    })),
  });
}
