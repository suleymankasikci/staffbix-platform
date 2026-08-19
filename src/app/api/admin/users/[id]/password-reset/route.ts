import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
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
 * POST /api/admin/users/[id]/password-reset
 *
 * Triggers a password-reset for the given user. A dedicated reset email
 * flow is scheduled for Sprint 15 (no `/api/auth/password/reset` route
 * exists yet — verified by listing `src/app/api/auth/**`). For now this
 * endpoint:
 *   1. flips `mustChangePassword = true` so the next successful login
 *      forces a change, and
 *   2. writes a `user.password.reset_requested` audit row.
 *
 * Once the reset-email flow lands, this handler will call into it
 * instead of (or in addition to) the flag — the audit + 200 contract
 * stays the same so the admin UI doesn't need to change.
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "POST /api/admin/users/[id]/password-reset",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  try {
    const [target] = await db
      .select({ id: users.id, tenantId: users.tenantId, email: users.email })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await db
      .update(users)
      .set({ mustChangePassword: true, updatedAt: new Date() })
      .where(eq(users.id, id));

    await logSecurityEvent({
      kind: "user.password.reset_requested",
      tenantId: target.tenantId,
      userId: target.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        targetEmail: target.email,
        source: "admin",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin.users.password-reset] failed", err);
    return NextResponse.json(
      { error: "Could not trigger password reset." },
      { status: 500 },
    );
  }
}
