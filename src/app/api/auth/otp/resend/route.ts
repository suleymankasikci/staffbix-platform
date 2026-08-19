import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  resolveSession,
  SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
} from "@/lib/auth/session";
import { issueOtp } from "@/lib/auth/otp";
import { getClientIp, getUserAgent, readJson } from "@/lib/auth/request";
import { consume } from "@/lib/auth/rate-limit";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";
import { queueEmail, buildOtpMessage } from "@/lib/mail/send";
import { normalizeLocale } from "@/lib/i18n/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ResendBody {
  scope?: "app" | "admin";
}

/**
 * POST /api/auth/otp/resend
 *
 * Re-issues an OTP for the current OTP-pending session. Subject to the
 * standard `otp:{email}` rate limit (5/15min) so a malicious client
 * can't fan out OTPs.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await readJson<ResendBody>(req);
  const scope: "app" | "admin" = body?.scope === "admin" ? "admin" : "app";

  const jar = await cookies();
  const cookieName = scope === "admin" ? ADMIN_SESSION_COOKIE : SESSION_COOKIE;
  const token = jar.get(cookieName)?.value;
  if (!token) {
    return NextResponse.json({ error: "Session not found." }, { status: 401 });
  }

  const resolved = await resolveSession(token);
  if (!resolved) {
    jar.delete(cookieName);
    return NextResponse.json({ error: "Session expired." }, { status: 401 });
  }

  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  const burst = await rateLimitOr429("api", `ip:${ip ?? "unknown"}`, {
    ip,
    userAgent: ua,
    tenantId: resolved.tenantId,
    userId: resolved.userId,
    route: "POST /api/auth/otp/resend",
  });
  if (burst) return burst;

  const limit = await consume("otp", resolved.user.email);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many codes requested. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const purpose = resolved.user.emailVerifiedAt ? "web_login" : "signup_verify_email";
  const { code } = await issueOtp({
    userId: resolved.userId,
    purpose,
    bindSessionIdHash: resolved.sessionIdHash,
  });
  await queueEmail({
    idemKey: `${purpose}-otp:${resolved.userId}:${Date.now()}`,
    message: buildOtpMessage({
      to: resolved.user.email,
      code,
      purpose: purpose === "signup_verify_email" ? "signup" : "login",
      ttlMinutes: 10,
      locale: normalizeLocale(resolved.user.locale) ?? "en",
    }),
    tenantId: resolved.tenantId,
    userId: resolved.userId,
  });
  await logSecurityEvent({
    kind: "user.otp.issued",
    tenantId: resolved.tenantId,
    userId: resolved.userId,
    ip,
    userAgent: ua,
    payload: { purpose, resent: true },
  });

  return NextResponse.json({ ok: true, remaining: limit.remaining });
}
