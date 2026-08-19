import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  resolveSession,
  revokeSession,
  SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
} from "@/lib/auth/session";
import { getClientIp, getUserAgent } from "@/lib/auth/request";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout
 *
 * Revokes the session row server-side AND deletes both cookies (the
 * customer and admin scopes). Idempotent — calling with no session
 * returns 200.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const jar = await cookies();
  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  const throttled = await rateLimitOr429("api", `ip:${ip ?? "unknown"}`, {
    ip,
    userAgent: ua,
    route: "POST /api/auth/logout",
  });
  if (throttled) return throttled;

  for (const name of [SESSION_COOKIE, ADMIN_SESSION_COOKIE]) {
    const token = jar.get(name)?.value;
    if (!token) continue;
    const resolved = await resolveSession(token);
    if (resolved) {
      await revokeSession(resolved.sessionIdHash);
      await logSecurityEvent({
        kind: "user.session.revoked",
        tenantId: resolved.tenantId,
        userId: resolved.userId,
        ip,
        userAgent: ua,
        payload: { reason: "logout", cookie: name },
      });
    }
    jar.delete(name);
  }

  return NextResponse.json({ ok: true });
}
