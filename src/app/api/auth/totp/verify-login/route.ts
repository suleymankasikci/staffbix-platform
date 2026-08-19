import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  resolveSession,
  markSessionOtpVerified,
  SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
} from "@/lib/auth/session";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { getClientIp, getUserAgent, readJson } from "@/lib/auth/request";
import { logSecurityEvent } from "@/lib/audit/log";
import { verifyTotp } from "@/lib/auth/totp";
import { decryptForTenantString } from "@/lib/crypto/encrypt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  code?: string;
  scope?: "app" | "admin";
}

/**
 * POST /api/auth/totp/verify-login
 *
 * Alternative to /api/auth/otp/verify for users that have completed
 * TOTP enrolment. Same effect — promotes the OTP-pending session to a
 * fully authenticated one — but the proof is a TOTP code from the
 * user's authenticator app rather than an emailed 6-digit OTP.
 *
 * The user can still fall back to email OTP at any time: both endpoints
 * accept the same OTP-pending session cookie. Whichever succeeds first
 * marks the session verified.
 *
 * Auth: cookie + TOTP code. Per-IP throttle. Emits `user.totp.ok` /
 * `user.totp.fail`.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);
  const ua = getUserAgent(req);
  const throttled = await rateLimitOr429("api", `ip:${ip ?? "unknown"}`, {
    ip,
    userAgent: ua,
    route: "POST /api/auth/totp/verify-login",
  });
  if (throttled) return throttled;

  const body = await readJson<Body>(req);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const scope: "app" | "admin" = body?.scope === "admin" ? "admin" : "app";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "Enter the 6-digit code." },
      { status: 400 },
    );
  }

  const jar = await cookies();
  const cookieName = scope === "admin" ? ADMIN_SESSION_COOKIE : SESSION_COOKIE;
  const token = jar.get(cookieName)?.value;
  if (!token) {
    return NextResponse.json(
      { error: "Session not found. Sign in again." },
      { status: 401 },
    );
  }

  const resolved = await resolveSession(token);
  if (!resolved) {
    jar.delete(cookieName);
    return NextResponse.json(
      { error: "Session expired. Sign in again." },
      { status: 401 },
    );
  }

  // The user must have completed TOTP enrolment.
  if (!resolved.user.totpEnrolledAt || !resolved.user.totpSecretBlob) {
    return NextResponse.json(
      { error: "TOTP is not enabled for this account." },
      { status: 409 },
    );
  }

  let secret: Buffer;
  try {
    const b64 = await decryptForTenantString(
      resolved.tenantId,
      resolved.user.totpSecretBlob,
    );
    secret = Buffer.from(b64, "base64");
  } catch {
    return NextResponse.json(
      { error: "TOTP secret unreadable. Contact support." },
      { status: 500 },
    );
  }

  if (!verifyTotp(secret, code)) {
    await logSecurityEvent({
      kind: "user.totp.fail",
      tenantId: resolved.tenantId,
      userId: resolved.userId,
      ip,
      userAgent: ua,
      payload: { phase: "login_verify", scope },
    });
    return NextResponse.json(
      { error: "Code did not match. Try again." },
      { status: 401 },
    );
  }

  await markSessionOtpVerified(resolved.sessionIdHash);
  await logSecurityEvent({
    kind: "user.totp.ok",
    tenantId: resolved.tenantId,
    userId: resolved.userId,
    ip,
    userAgent: ua,
    payload: { phase: "login_verify", scope },
  });

  const redirect =
    scope === "admin" ? "/admin" : `/${resolved.user.locale}/app/dashboard`;
  return NextResponse.json({ ok: true, redirect }, { status: 200 });
}
