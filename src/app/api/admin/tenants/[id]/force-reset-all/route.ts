import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sessions, tenants, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";
import { getClientIp, getUserAgent } from "@/lib/auth/request";
import { UUID_RE } from "@/lib/admin-routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/tenants/[id]/force-reset-all
 *
 * Hard-eject everyone on a tenant — used for suspected credential leaks.
 *   1. flip `mustChangePassword = true` on every user
 *   2. delete every `sessions` row for the tenant (web sessions are gone)
 *   3. write one `user.session.revoked` audit row per user, plus one
 *      `user.password.reset_requested` per user
 *
 * Refresh tokens (mobile) are out of scope here — Sprint 15 will extend
 * this to `refresh_tokens` once we wire token revocation.
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "POST /api/admin/tenants/[id]/force-reset-all",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
  }

  try {
    const [tenantRow] = await db
      .select({ id: tenants.id, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);
    if (!tenantRow) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const tenantUsers = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.tenantId, id));

    await db
      .update(users)
      .set({ mustChangePassword: true, updatedAt: new Date() })
      .where(eq(users.tenantId, id));

    // Sessions FK cascades from tenant delete, but we're not deleting
    // the tenant — explicit DELETE on sessions is the right move.
    await db.delete(sessions).where(eq(sessions.tenantId, id));

    const ip = getClientIp(req);
    const userAgent = getUserAgent(req);

    // Log a revocation row + a reset-requested row per user. Both kinds
    // already exist in the security_event_kind enum.
    await Promise.all(
      tenantUsers.flatMap((u) => [
        logSecurityEvent({
          kind: "user.session.revoked",
          tenantId: id,
          userId: u.id,
          ip,
          userAgent,
          payload: {
            actorUserId: session.user.id,
            targetEmail: u.email,
            source: "admin.force_reset_all",
          },
        }),
        logSecurityEvent({
          kind: "user.password.reset_requested",
          tenantId: id,
          userId: u.id,
          ip,
          userAgent,
          payload: {
            actorUserId: session.user.id,
            targetEmail: u.email,
            source: "admin.force_reset_all",
          },
        }),
      ]),
    );

    return NextResponse.json({ ok: true, affected: tenantUsers.length });
  } catch (err) {
    console.error("[admin.tenants.force-reset-all] failed", err);
    return NextResponse.json(
      { error: "Could not force reset." },
      { status: 500 },
    );
  }
}
