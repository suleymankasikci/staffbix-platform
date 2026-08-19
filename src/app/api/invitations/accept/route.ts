import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  resolveInvitation,
  acceptInvitation,
} from "@/lib/auth/invitations";
import {
  createSession,
  markSessionOtpVerified,
  SESSION_COOKIE,
  SESSION_COOKIE_MAX_AGE,
} from "@/lib/auth/session";
import { hashToken } from "@/lib/auth/tokens";
import { consume } from "@/lib/auth/rate-limit";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import {
  getClientIp,
  getUserAgent,
  getDeviceFingerprint,
  readJson,
} from "@/lib/auth/request";
import { logSecurityEvent } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AcceptBody {
  token?: string;
  name?: string;
  password?: string;
}

/**
 * POST /api/invitations/accept
 *
 * Server-side handler for the /accept/[token] page submit.
 * Body: { token, name, password }. Creates the user and signs them in
 * with a verified session (no OTP gate — the invite link is the
 * second factor).
 *
 * Rate-limited per-IP to slow brute-force token guessing (tokens are
 * 64-char hex so this is a deep defense layer).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);
  const burst = await rateLimitOr429("api", `ip:${ip ?? "unknown"}`, {
    ip,
    userAgent: getUserAgent(req),
    route: "POST /api/invitations/accept",
  });
  if (burst) return burst;

  const limit = await consume("register", ip ?? "unknown");
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const body = await readJson<AcceptBody>(req);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const token = typeof body.token === "string" ? body.token : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (password.length < 12) {
    return NextResponse.json(
      { error: "Password must be at least 12 characters." },
      { status: 400 },
    );
  }

  const result = await acceptInvitation({ token, name, password });
  if (!result.ok) {
    const status =
      result.reason === "invalid_or_expired"
        ? 410
        : result.reason === "email_already_member"
          ? 409
          : 500;
    return NextResponse.json(
      {
        error:
          result.reason === "invalid_or_expired"
            ? "This invitation link is no longer valid."
            : result.reason === "email_already_member"
              ? "This email is already a team member."
              : "Couldn't accept invitation. Please try again.",
        reason: result.reason,
      },
      { status },
    );
  }

  // Issue a verified session directly — the invite was the second factor.
  const ua = getUserAgent(req);
  const fingerprint = await getDeviceFingerprint(req);
  const { token: sessionToken } = await createSession({
    userId: result.userId,
    tenantId: result.tenantId,
    ip,
    userAgent: ua,
    deviceFingerprint: fingerprint,
  });
  await markSessionOtpVerified(hashToken(sessionToken));

  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });

  await logSecurityEvent({
    kind: "tenant.invitation.accepted",
    tenantId: result.tenantId,
    userId: result.userId,
    ip,
    userAgent: ua,
    payload: { name },
  });

  return NextResponse.json({ ok: true, userId: result.userId });
}

/**
 * GET /api/invitations/accept?token=...
 *
 * Look up the invite metadata (without consuming it) so the accept
 * page can display "You're joining {tenantName} as {role}, {email}"
 * before the user types their password.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const ipG = getClientIp(req);
  const throttledG = await rateLimitOr429("api", `ip:${ipG ?? "unknown"}`, {
    ip: ipG,
    userAgent: getUserAgent(req),
    route: "GET /api/invitations/accept",
  });
  if (throttledG) return throttledG;
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const resolved = await resolveInvitation(token);
  if (!resolved) {
    return NextResponse.json(
      { error: "This invitation link is no longer valid." },
      { status: 410 },
    );
  }
  return NextResponse.json({
    tenant: { name: resolved.tenant.name, slug: resolved.tenant.slug },
    invitation: {
      email: resolved.invitation.email,
      role: resolved.invitation.role,
      expiresAt: resolved.invitation.expiresAt,
    },
  });
}
