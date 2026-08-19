import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { supportTickets, tenants, users } from "@/lib/db/schema";
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
 * GET /api/admin/tickets/[id]
 *
 * Single ticket with tenant name joined. `triage` is jsonb — parsed at
 * the DB layer (drizzle returns it as a JS object already), passed
 * through to the client untouched.
 */
export async function GET(_req: Request, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "GET /api/admin/tickets/[id]",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
  }

  const [row] = await db
    .select({
      id: supportTickets.id,
      code: supportTickets.code,
      subject: supportTickets.subject,
      bodyPreview: supportTickets.bodyPreview,
      status: supportTickets.status,
      priority: supportTickets.priority,
      channel: supportTickets.channel,
      tenantId: supportTickets.tenantId,
      tenantName: tenants.name,
      reporterEmail: supportTickets.reporterEmail,
      reporterName: supportTickets.reporterName,
      assignedWorkerId: supportTickets.assignedWorkerId,
      assignedUserId: supportTickets.assignedUserId,
      conversationId: supportTickets.conversationId,
      externalThreadId: supportTickets.externalThreadId,
      triage: supportTickets.triage,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
      resolvedAt: supportTickets.resolvedAt,
    })
    .from(supportTickets)
    .innerJoin(tenants, eq(tenants.id, supportTickets.tenantId))
    .where(eq(supportTickets.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ticket: {
      id: row.id,
      code: row.code,
      subject: row.subject,
      bodyPreview: row.bodyPreview,
      status: row.status,
      priority: row.priority,
      channel: row.channel,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      reporterEmail: row.reporterEmail,
      reporterName: row.reporterName ?? row.reporterEmail,
      assignedWorkerId: row.assignedWorkerId,
      assignedUserId: row.assignedUserId,
      conversationId: row.conversationId,
      externalThreadId: row.externalThreadId,
      triage: row.triage,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
    },
  });
}

const VALID_STATUS = new Set(["open", "pending", "resolved", "closed"]);
const VALID_PRIORITY = new Set(["critical", "high", "normal", "low"]);

type TicketStatus = "open" | "pending" | "resolved" | "closed";
type TicketPriority = "critical" | "high" | "normal" | "low";

/**
 * PATCH /api/admin/tickets/[id]
 *
 * Update ticket status, priority, or staff assignee. When `status`
 * transitions to "resolved" we stamp `resolvedAt = now()`; transitioning
 * back to open/pending clears it. `assignedUserId: null` un-assigns.
 *
 * Audit kind is `ticket.updated` (Sprint 17 enum,
 * drizzle/0013_sprint17.sql).
 */
export async function PATCH(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "PATCH /api/admin/tickets/[id]",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
  }

  const body = await readJson<{
    status?: string;
    priority?: string;
    assignedUserId?: string | null;
  }>(req);
  if (
    !body ||
    (body.status === undefined &&
      body.priority === undefined &&
      body.assignedUserId === undefined)
  ) {
    return NextResponse.json(
      { error: "Provide at least one of: status, priority, assignedUserId" },
      { status: 400 },
    );
  }

  if (body.status !== undefined && !VALID_STATUS.has(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (body.priority !== undefined && !VALID_PRIORITY.has(body.priority)) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
  }
  if (
    body.assignedUserId !== undefined &&
    body.assignedUserId !== null &&
    !UUID_RE.test(body.assignedUserId)
  ) {
    return NextResponse.json(
      { error: "Invalid assignedUserId" },
      { status: 400 },
    );
  }

  try {
    const [current] = await db
      .select({
        id: supportTickets.id,
        tenantId: supportTickets.tenantId,
        status: supportTickets.status,
        priority: supportTickets.priority,
        assignedUserId: supportTickets.assignedUserId,
        resolvedAt: supportTickets.resolvedAt,
      })
      .from(supportTickets)
      .where(eq(supportTickets.id, id))
      .limit(1);
    if (!current) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Validate the assignee actually exists in the same tenant. NULL is
    // an explicit un-assign.
    if (body.assignedUserId) {
      const [assignee] = await db
        .select({ id: users.id, tenantId: users.tenantId })
        .from(users)
        .where(eq(users.id, body.assignedUserId))
        .limit(1);
      if (!assignee || assignee.tenantId !== current.tenantId) {
        return NextResponse.json(
          { error: "Assignee must belong to the same tenant" },
          { status: 400 },
        );
      }
    }

    const patch: Partial<{
      status: TicketStatus;
      priority: TicketPriority;
      assignedUserId: string | null;
      resolvedAt: Date | null;
      updatedAt: Date;
    }> = { updatedAt: new Date() };

    if (body.status !== undefined) {
      patch.status = body.status as TicketStatus;
      if (body.status === "resolved" && !current.resolvedAt) {
        patch.resolvedAt = new Date();
      } else if (
        (body.status === "open" || body.status === "pending") &&
        current.resolvedAt
      ) {
        patch.resolvedAt = null;
      }
    }
    if (body.priority !== undefined) {
      patch.priority = body.priority as TicketPriority;
    }
    if (body.assignedUserId !== undefined) {
      patch.assignedUserId = body.assignedUserId;
    }

    await db
      .update(supportTickets)
      .set(patch)
      .where(eq(supportTickets.id, id));

    await logSecurityEvent({
      kind: "ticket.updated",
      tenantId: current.tenantId,
      userId: session.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        subject: "ticket.updated",
        ticketId: id,
        from: {
          status: current.status,
          priority: current.priority,
          assignedUserId: current.assignedUserId,
        },
        to: {
          status: patch.status ?? current.status,
          priority: patch.priority ?? current.priority,
          assignedUserId:
            body.assignedUserId === undefined
              ? current.assignedUserId
              : body.assignedUserId,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin.tickets.patch] failed", err);
    return NextResponse.json(
      { error: "Could not update ticket." },
      { status: 500 },
    );
  }
}
