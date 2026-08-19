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
 * POST /api/admin/users/[id]/unban
 *
 * Restores `users.status` to "Active". Does not clear `failedLoginCount`
 * or `lockedUntil` — those are separate lockouts. If you want a clean
 * slate, hit the password-reset endpoint after.
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "POST /api/admin/users/[id]/unban",
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
      .set({ status: "Active", updatedAt: new Date() })
      .where(eq(users.id, id));

    await logSecurityEvent({
      kind: "user.unbanned",
      tenantId: target.tenantId,
      userId: target.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        targetEmail: target.email,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin.users.unban] failed", err);
    return NextResponse.json(
      { error: "Could not unban user." },
      { status: 500 },
    );
  }
}
