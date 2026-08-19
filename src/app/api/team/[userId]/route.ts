import { type NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { readJson } from "@/lib/auth/request";
import { logSecurityEvent } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ userId: string }>;
}

const ID_RE = /^[0-9a-f-]{36}$/;
const ASSIGNABLE_ROLES = new Set(["Admin", "Editor", "Reviewer"] as const);
type AssignableRole = "Admin" | "Editor" | "Reviewer";

/**
 * PATCH /api/team/[userId]
 *
 * Owner / Admin only. Updates a single team member's role. The Owner row
 * is immutable here — ownership transfer is a separate flow. The caller
 * cannot demote themselves below Admin (would lock them out of admin
 * UIs). All role changes are written to the security ledger so the audit
 * page reflects them.
 */
export async function PATCH(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { userId } = await ctx.params;
  if (!ID_RE.test(userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const session = await requireApp();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "Owner" && session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "PATCH /api/team/[userId]",
  });
  if (t) return t;

  const body = await readJson<{ role?: string }>(req);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const rawRole = typeof body.role === "string" ? body.role : "";
  // Accept either the canonical case or lowercase from the client.
  const normalized =
    rawRole.length > 0
      ? rawRole[0].toUpperCase() + rawRole.slice(1).toLowerCase()
      : "";
  if (!ASSIGNABLE_ROLES.has(normalized as AssignableRole)) {
    return NextResponse.json(
      { error: `role must be one of: ${[...ASSIGNABLE_ROLES].join(", ")}` },
      { status: 400 },
    );
  }
  const newRole = normalized as AssignableRole;

  const [target] = await db
    .select({ id: users.id, role: users.role, email: users.email })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.tenantId, session.tenantId)))
    .limit(1);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (target.role === "Owner") {
    return NextResponse.json(
      { error: "Owner role is not editable here." },
      { status: 400 },
    );
  }
  if (target.id === session.user.id && newRole !== "Admin") {
    return NextResponse.json(
      { error: "Cannot demote yourself below Admin." },
      { status: 400 },
    );
  }

  if (target.role === newRole) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  await db
    .update(users)
    .set({ role: newRole, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await logSecurityEvent({
    kind: "team.role_changed",
    tenantId: session.tenantId,
    userId: session.user.id,
    payload: {
      subject: "team.role_changed",
      targetUserId: target.id,
      targetEmail: target.email,
      from: target.role,
      to: newRole,
    },
  });

  return NextResponse.json({ ok: true, role: newRole });
}

/**
 * DELETE /api/team/[userId]
 *
 * Owner / Admin only. Soft-removes a member by flipping their status
 * to `Banned` and clearing the password hash. Hard-deleting users would
 * cascade-orphan a pile of audit/foreign-key rows; the soft path lets
 * us preserve attribution while preventing further sign-in. Owner row
 * cannot be removed; admins cannot remove themselves.
 */
export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { userId } = await ctx.params;
  if (!ID_RE.test(userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const session = await requireApp();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "Owner" && session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "DELETE /api/team/[userId]",
  });
  if (t) return t;

  const [target] = await db
    .select({ id: users.id, role: users.role, email: users.email })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.tenantId, session.tenantId)))
    .limit(1);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (target.role === "Owner") {
    return NextResponse.json(
      { error: "Owner cannot be removed here." },
      { status: 400 },
    );
  }
  if (target.id === session.user.id) {
    return NextResponse.json(
      { error: "You cannot remove your own account." },
      { status: 400 },
    );
  }

  await db
    .update(users)
    .set({
      status: "Banned",
      passwordHash: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await logSecurityEvent({
    kind: "team.member_removed",
    tenantId: session.tenantId,
    userId: session.user.id,
    payload: {
      subject: "team.member_removed",
      targetUserId: target.id,
      targetEmail: target.email,
      previousRole: target.role,
    },
  });

  return NextResponse.json({ ok: true });
}
