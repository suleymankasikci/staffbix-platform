import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { getClientIp, getUserAgent, readJson } from "@/lib/auth/request";
import { logSecurityEvent } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProfileBody {
  name?: string;
}

/**
 * PATCH /api/me/profile
 *
 * Updates the signed-in user's display name. Email/role/tenant cannot
 * be self-edited — those are admin actions.
 *
 * Every accepted change emits a `user.profile.updated` audit event.
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "PATCH /api/me/profile",
  });
  if (t) return t;

  const body = await readJson<ProfileBody>(req);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Please enter a name (max 120 chars)." }, { status: 400 });
  }

  if (name === session.user.name) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const [updated] = await db
    .update(users)
    .set({ name, updatedAt: new Date() })
    .where(eq(users.id, session.userId))
    .returning({ id: users.id, name: users.name });

  await logSecurityEvent({
    kind: "user.profile.updated",
    tenantId: session.tenantId,
    userId: session.userId,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    payload: { field: "name", from: session.user.name, to: name },
  });

  return NextResponse.json({ ok: true, user: updated });
}
