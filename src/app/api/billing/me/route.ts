import { NextResponse } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  tenants,
  plans,
  workers,
  aiUsage,
  platformInvoices,
  users,
  invitations,
} from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/billing/me — current tenant's plan, usage, and invoice
 * history for the /app/[lang]/app/billing page.
 *
 * Worker count comes from a live `count(*)` on `workers` (terminated
 * excluded). AI spend is summed from `ai_usage.cost_microcents` since
 * the first day of the current UTC month — same convention as
 * `checkAiSpendCap` in `src/lib/billing/limits.ts`. Invoice list is the
 * 12 most recent `platform_invoices` rows for the tenant.
 */
export async function GET(): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.tenantId;
  const t = await rateLimitOr429("api", `tenant:${tenantId}`, {
    tenantId,
    userId: session.user.id,
    route: "GET /api/billing/me",
  });
  if (t) return t;

  const [tenantRow] = await db
    .select({
      id: tenants.id,
      planId: tenants.planId,
      status: tenants.status,
      trialEndsAt: tenants.trialEndsAt,
      plan: plans,
    })
    .from(tenants)
    .innerJoin(plans, eq(plans.id, tenants.planId))
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenantRow) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  // Live worker count (excluding terminated). Matches checkWorkersCap.
  const [workersCountRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(workers)
    .where(
      and(
        eq(workers.tenantId, tenantId),
        sql`${workers.status} <> 'terminated'`,
      ),
    );
  const workersCurrent = Number(workersCountRow?.c ?? 0);

  // AI spend month-to-date in dollars (microcents → dollars = /1e8).
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const [spendRow] = await db
    .select({
      microcents: sql<string>`COALESCE(SUM(${aiUsage.costMicrocents}), 0)::text`,
    })
    .from(aiUsage)
    .where(
      and(
        eq(aiUsage.tenantId, tenantId),
        gte(aiUsage.createdAt, monthStart),
      ),
    );
  const aiSpendDollarsCurrent =
    Math.round(Number(spendRow?.microcents ?? "0") / 1_000_000) / 100;

  // Team seats: active users (non-Banned) + pending invitations.
  // Matches what checkTeamSeatsCap counts.
  const [seatRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(users)
    .where(
      and(eq(users.tenantId, tenantId), sql`${users.status} <> 'Banned'`),
    );
  const [pendingInviteRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(invitations)
    .where(
      and(
        eq(invitations.tenantId, tenantId),
        eq(invitations.status, "pending"),
      ),
    );
  const teamSeatsCurrent =
    Number(seatRow?.c ?? 0) + Number(pendingInviteRow?.c ?? 0);

  // Max channels currently attached to any single worker — useful so
  // the UI can tell the operator how close they are to their per-worker
  // ceiling without iterating the whole workforce client-side.
  const [maxChannelsRow] = await db
    .select({
      max: sql<number>`COALESCE(MAX(array_length(${workers.channels}, 1)), 0)::int`,
    })
    .from(workers)
    .where(
      and(
        eq(workers.tenantId, tenantId),
        sql`${workers.status} <> 'terminated'`,
      ),
    );
  const channelsPerWorkerMaxInUse = Number(maxChannelsRow?.max ?? 0);

  // Last 12 invoices for this tenant.
  const invoiceRows = await db
    .select({
      id: platformInvoices.id,
      amountCents: platformInvoices.amountCents,
      currency: platformInvoices.currency,
      status: platformInvoices.status,
      hostedInvoiceUrl: platformInvoices.hostedInvoiceUrl,
      pdfUrl: platformInvoices.pdfUrl,
      issuedAt: platformInvoices.issuedAt,
      paidAt: platformInvoices.paidAt,
    })
    .from(platformInvoices)
    .where(eq(platformInvoices.tenantId, tenantId))
    .orderBy(desc(platformInvoices.issuedAt))
    .limit(12);

  const invoices = invoiceRows.map((r) => ({
    id: r.id,
    amountCents: r.amountCents,
    currency: r.currency,
    status: r.status,
    hostedInvoiceUrl: r.hostedInvoiceUrl,
    pdfUrl: r.pdfUrl,
    issuedAt: r.issuedAt ? r.issuedAt.toISOString() : null,
    paidAt: r.paidAt ? r.paidAt.toISOString() : null,
  }));

  return NextResponse.json({
    tenant: {
      id: tenantRow.id,
      planId: tenantRow.planId,
      status: tenantRow.status,
      trialEndsAt: tenantRow.trialEndsAt
        ? tenantRow.trialEndsAt.toISOString()
        : null,
    },
    plan: tenantRow.plan,
    usage: {
      workers: {
        current: workersCurrent,
        limit: tenantRow.plan.maxWorkers,
      },
      aiSpendDollars: {
        current: aiSpendDollarsCurrent,
        limit: tenantRow.plan.maxMonthlyAiDollars,
        monthStart: monthStart.toISOString(),
      },
      teamSeats: {
        current: teamSeatsCurrent,
        limit: tenantRow.plan.maxTeamSeats,
      },
      channelsPerWorker: {
        current: channelsPerWorkerMaxInUse,
        limit: tenantRow.plan.maxChannelsPerWorker,
      },
    },
    invoices,
  });
}
