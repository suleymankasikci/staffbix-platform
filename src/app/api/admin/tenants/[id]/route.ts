import { NextResponse, type NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  tenants,
  users,
  platformInvoices,
  supportTickets,
  workers,
  plans,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";
import { getClientIp, getUserAgent, readJson } from "@/lib/auth/request";
import { UUID_RE } from "@/lib/admin-routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/tenants/[id]
 *
 * Full bundle for the tenant detail page: identity, users, invoices,
 * tickets, workers. One trip rather than five — the page renders all
 * sections at once so a waterfall would be the wrong shape.
 */
export async function GET(_req: Request, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "GET /api/admin/tenants/[id]",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
  }

  const [tenantRow] = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      planId: tenants.planId,
      status: tenants.status,
      country: tenants.country,
      locale: tenants.locale,
      timezone: tenants.timezone,
      stripeCustomerId: tenants.stripeCustomerId,
      createdAt: tenants.createdAt,
      updatedAt: tenants.updatedAt,
      trialEndsAt: tenants.trialEndsAt,
    })
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);

  if (!tenantRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [userRows, invoiceRows, ticketRows, workerRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.tenantId, id))
      .orderBy(desc(users.createdAt)),

    db
      .select({
        id: platformInvoices.id,
        stripeInvoiceId: platformInvoices.stripeInvoiceId,
        planId: platformInvoices.planId,
        amountCents: platformInvoices.amountCents,
        currency: platformInvoices.currency,
        status: platformInvoices.status,
        hostedInvoiceUrl: platformInvoices.hostedInvoiceUrl,
        pdfUrl: platformInvoices.pdfUrl,
        issuedAt: platformInvoices.issuedAt,
        paidAt: platformInvoices.paidAt,
      })
      .from(platformInvoices)
      .where(eq(platformInvoices.tenantId, id))
      .orderBy(desc(platformInvoices.issuedAt)),

    db
      .select({
        id: supportTickets.id,
        code: supportTickets.code,
        subject: supportTickets.subject,
        bodyPreview: supportTickets.bodyPreview,
        status: supportTickets.status,
        priority: supportTickets.priority,
        channel: supportTickets.channel,
        reporterName: supportTickets.reporterName,
        reporterEmail: supportTickets.reporterEmail,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
      })
      .from(supportTickets)
      .where(eq(supportTickets.tenantId, id))
      .orderBy(desc(supportTickets.updatedAt)),

    db
      .select({
        id: workers.id,
        name: workers.name,
        roleSlug: workers.roleSlug,
        status: workers.status,
        createdAt: workers.createdAt,
      })
      .from(workers)
      .where(eq(workers.tenantId, id))
      .orderBy(desc(workers.createdAt)),
  ]);

  return NextResponse.json({
    tenant: {
      id: tenantRow.id,
      name: tenantRow.name,
      slug: tenantRow.slug,
      planId: tenantRow.planId,
      status: tenantRow.status,
      country: tenantRow.country,
      locale: tenantRow.locale,
      timezone: tenantRow.timezone,
      stripeCustomerId: tenantRow.stripeCustomerId,
      createdAt: tenantRow.createdAt.toISOString(),
      updatedAt: tenantRow.updatedAt.toISOString(),
      trialEndsAt: tenantRow.trialEndsAt?.toISOString() ?? null,
    },
    users: userRows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    })),
    invoices: invoiceRows.map((i) => ({
      id: i.id,
      stripeInvoiceId: i.stripeInvoiceId,
      planId: i.planId,
      amountCents: i.amountCents,
      currency: i.currency,
      status: i.status,
      hostedInvoiceUrl: i.hostedInvoiceUrl,
      pdfUrl: i.pdfUrl,
      issuedAt: i.issuedAt?.toISOString() ?? null,
      paidAt: i.paidAt?.toISOString() ?? null,
    })),
    tickets: ticketRows.map((t) => ({
      id: t.id,
      code: t.code,
      subject: t.subject,
      bodyPreview: t.bodyPreview,
      status: t.status,
      priority: t.priority,
      channel: t.channel,
      reporterName: t.reporterName ?? t.reporterEmail,
      reporterEmail: t.reporterEmail,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    workers: workerRows.map((w) => ({
      id: w.id,
      name: w.name,
      roleSlug: w.roleSlug,
      status: w.status,
      createdAt: w.createdAt.toISOString(),
    })),
  });
}

const VALID_STATUSES = new Set(["active", "suspended"]);

/**
 * PATCH /api/admin/tenants/[id]
 *
 * Update tenant `status` and/or `planId`. Each change produces a
 * dedicated audit row:
 *   - status "active"    → tenant.reactivated
 *   - status "suspended" → tenant.suspended
 *   - planId change      → plan.upgraded / plan.downgraded
 *
 * Plan ordering for up/downgrade direction comes from `plans.sortOrder`.
 * Stripe subscription sync (proration, schedule changes) is deferred to
 * Sprint 17 — for now this only updates our mirror of `tenants.planId`.
 */
export async function PATCH(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "PATCH /api/admin/tenants/[id]",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
  }

  const body = await readJson<{ status?: string; planId?: string }>(req);
  if (!body || (body.status === undefined && body.planId === undefined)) {
    return NextResponse.json(
      { error: "Provide at least one of: status, planId" },
      { status: 400 },
    );
  }

  if (body.status !== undefined && !VALID_STATUSES.has(body.status)) {
    return NextResponse.json(
      { error: "status must be 'active' or 'suspended'" },
      { status: 400 },
    );
  }

  try {
    const [current] = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        status: tenants.status,
        planId: tenants.planId,
      })
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    if (!current) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Validate the new plan exists. We also use sortOrder to pick the
    // right audit kind for up- vs downgrade.
    let oldPlanOrder: number | null = null;
    let newPlanOrder: number | null = null;
    if (body.planId !== undefined) {
      const [newPlan] = await db
        .select({ id: plans.id, sortOrder: plans.sortOrder })
        .from(plans)
        .where(eq(plans.id, body.planId))
        .limit(1);
      if (!newPlan) {
        return NextResponse.json(
          { error: "Unknown planId" },
          { status: 400 },
        );
      }
      newPlanOrder = newPlan.sortOrder;
      const [oldPlan] = await db
        .select({ sortOrder: plans.sortOrder })
        .from(plans)
        .where(eq(plans.id, current.planId))
        .limit(1);
      oldPlanOrder = oldPlan?.sortOrder ?? null;
    }

    const patch: Partial<{
      status: "active" | "suspended";
      planId: string;
      updatedAt: Date;
    }> = { updatedAt: new Date() };
    if (body.status === "active" || body.status === "suspended") {
      patch.status = body.status;
    }
    if (body.planId !== undefined) patch.planId = body.planId;

    await db.update(tenants).set(patch).where(eq(tenants.id, id));

    const ip = getClientIp(req);
    const userAgent = getUserAgent(req);

    if (patch.status && patch.status !== current.status) {
      await logSecurityEvent({
        kind: patch.status === "suspended" ? "tenant.suspended" : "tenant.reactivated",
        tenantId: id,
        userId: session.user.id,
        ip,
        userAgent,
        payload: {
          actorUserId: session.user.id,
          from: current.status,
          to: patch.status,
          tenantName: current.name,
        },
      });
    }

    if (patch.planId && patch.planId !== current.planId) {
      const upgraded =
        oldPlanOrder !== null && newPlanOrder !== null
          ? newPlanOrder > oldPlanOrder
          : true; // default to "upgrade" if we can't tell
      await logSecurityEvent({
        kind: upgraded ? "plan.upgraded" : "plan.downgraded",
        tenantId: id,
        userId: session.user.id,
        ip,
        userAgent,
        payload: {
          actorUserId: session.user.id,
          fromPlan: current.planId,
          toPlan: patch.planId,
          // Sprint 17: also push the change to Stripe (subscription
          // schedule / proration). For now this is a mirror-only update.
          stripeSync: false,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin.tenants.patch] failed", err);
    return NextResponse.json(
      { error: "Could not update tenant." },
      { status: 500 },
    );
  }
}
