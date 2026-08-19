import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
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
 * POST /api/admin/users/[id]/ban
 *
 * Sets `users.status = "Banned"`. Reason (optional) is captured in the
 * audit payload so future review can see why this happened. Idempotent:
 * banning an already-banned user is a no-op but still writes an audit
 * row — useful when the same incident triggers two operators.
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "POST /api/admin/users/[id]/ban",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const body = await readJson<{ reason?: string }>(req);
  const reason =
    body && typeof body.reason === "string" ? body.reason.slice(0, 500) : null;

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
      .set({ status: "Banned", updatedAt: new Date() })
      .where(eq(users.id, id));

    await logSecurityEvent({
      kind: "user.banned",
      tenantId: target.tenantId,
      userId: target.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        targetEmail: target.email,
        reason,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin.users.ban] failed", err);
    return NextResponse.json(
      { error: "Could not ban user." },
      { status: 500 },
    );
  }
}
