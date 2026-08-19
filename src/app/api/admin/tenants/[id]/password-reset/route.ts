import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tenants, users } from "@/lib/db/schema";
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
 * POST /api/admin/tenants/[id]/password-reset
 *
 * Trigger a password reset for the tenant's Owner (the billing contact).
 * Marks the Owner's row with `mustChangePassword = true` and writes a
 * `user.password.reset_requested` audit row pointing at them — both the
 * tenantId and the targetUserId end up in the audit payload.
 *
 * If the tenant has no Owner (mid-invite states), we 404 — Sprint 15
 * adds a fallback to "any Admin" for those edge cases.
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "POST /api/admin/tenants/[id]/password-reset",
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

    const [owner] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(and(eq(users.tenantId, id), eq(users.role, "Owner")))
      .limit(1);

    if (!owner) {
      return NextResponse.json(
        { error: "Tenant has no Owner yet." },
        { status: 404 },
      );
    }

    await db
      .update(users)
      .set({ mustChangePassword: true, updatedAt: new Date() })
      .where(eq(users.id, owner.id));

    await logSecurityEvent({
      kind: "user.password.reset_requested",
      tenantId: id,
      userId: owner.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        targetUserId: owner.id,
        targetEmail: owner.email,
        source: "admin.tenant",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin.tenants.password-reset] failed", err);
    return NextResponse.json(
      { error: "Could not trigger password reset." },
      { status: 500 },
    );
  }
}
