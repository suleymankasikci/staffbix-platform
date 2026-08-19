import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { staff } from "@/lib/db/schema";
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

type RoleVal = "owner" | "engineer" | "support" | "analyst";
type StatusVal = "active" | "invited" | "suspended";

const VALID_ROLE = new Set<RoleVal>(["owner", "engineer", "support", "analyst"]);
const VALID_STATUS = new Set<StatusVal>(["active", "invited", "suspended"]);

/**
 * PATCH /api/admin/staff/[id]
 *
 * Update role and/or status on an existing staff row. Audit kind is
 * `staff.updated` (Sprint 17 enum, drizzle/0013_sprint17.sql).
 *
 * DELETE /api/admin/staff/[id]
 *
 * Hard delete. Sprint 19 will add a soft "suspended" path for invitations
 * that have not yet been accepted; for now removal is final.
 */
export async function PATCH(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "PATCH /api/admin/staff/[id]",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid staff id" }, { status: 400 });
  }

  const body = await readJson<{ role?: unknown; status?: unknown; name?: unknown }>(req);
  if (
    !body ||
    (body.role === undefined && body.status === undefined && body.name === undefined)
  ) {
    return NextResponse.json(
      { error: "Provide at least one of: role, status, name" },
      { status: 400 },
    );
  }

  if (body.role !== undefined && (typeof body.role !== "string" || !VALID_ROLE.has(body.role as RoleVal))) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (body.status !== undefined && (typeof body.status !== "string" || !VALID_STATUS.has(body.status as StatusVal))) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    if (body.name.length > 200) {
      return NextResponse.json({ error: "name too long" }, { status: 400 });
    }
  }

  try {
    const [current] = await db
      .select({
        id: staff.id,
        email: staff.email,
        role: staff.role,
        status: staff.status,
        name: staff.name,
      })
      .from(staff)
      .where(eq(staff.id, id))
      .limit(1);
    if (!current) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const patch: Partial<{
      role: RoleVal;
      status: StatusVal;
      name: string;
      updatedAt: Date;
    }> = { updatedAt: new Date() };

    if (body.role !== undefined) patch.role = body.role as RoleVal;
    if (body.status !== undefined) patch.status = body.status as StatusVal;
    if (body.name !== undefined) patch.name = (body.name as string).trim();

    await db.update(staff).set(patch).where(eq(staff.id, id));

    await logSecurityEvent({
      kind: "staff.updated",
      userId: session.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        subject: "staff.updated",
        staffId: id,
        email: current.email,
        from: {
          role: current.role,
          status: current.status,
          name: current.name,
        },
        to: {
          role: patch.role ?? current.role,
          status: patch.status ?? current.status,
          name: patch.name ?? current.name,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin.staff.patch] failed", err);
    return NextResponse.json(
      { error: "Could not update staff." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "DELETE /api/admin/staff/[id]",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid staff id" }, { status: 400 });
  }

  try {
    const [current] = await db
      .select({
        id: staff.id,
        email: staff.email,
        role: staff.role,
        status: staff.status,
      })
      .from(staff)
      .where(eq(staff.id, id))
      .limit(1);
    if (!current) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    await db.delete(staff).where(eq(staff.id, id));

    await logSecurityEvent({
      kind: "staff.removed",
      userId: session.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        subject: "staff.removed",
        staffId: id,
        email: current.email,
        role: current.role,
        status: current.status,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin.staff.delete] failed", err);
    return NextResponse.json(
      { error: "Could not remove staff." },
      { status: 500 },
    );
  }
}
