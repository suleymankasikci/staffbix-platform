import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  resolveSession,
  markSessionOtpVerified,
  SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
} from "@/lib/auth/session";
import { verifyOtp } from "@/lib/auth/otp";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import {
  getClientIp,
  getUserAgent,
  readJson,
} from "@/lib/auth/request";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface VerifyBody {
  code?: string;
  scope?: "app" | "admin";
}

/**
 * POST /api/auth/otp/verify
 *
 * Upgrades the current OTP-pending session to a fully authenticated one.
 * Determines the purpose (signup vs login) by the user's
 * `email_verified_at`: if null, the OTP must match `signup_verify_email`
 * and we set the verified-at timestamp on success.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip0 = getClientIp(req);
  const ua0 = getUserAgent(req);
  const throttled = await rateLimitOr429("api", `ip:${ip0 ?? "unknown"}`, {
    ip: ip0,
    userAgent: ua0,
    route: "POST /api/auth/otp/verify",
  });
  if (throttled) return throttled;

  const body = await readJson<VerifyBody>(req);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const scope: "app" | "admin" = body?.scope === "admin" ? "admin" : "app";

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const jar = await cookies();
  const cookieName = scope === "admin" ? ADMIN_SESSION_COOKIE : SESSION_COOKIE;
  const token = jar.get(cookieName)?.value;
  if (!token) {
    return NextResponse.json({ error: "Session not found. Sign in again." }, { status: 401 });
  }

  const resolved = await resolveSession(token);
  if (!resolved) {
    jar.delete(cookieName);
    return NextResponse.json({ error: "Session expired. Sign in again." }, { status: 401 });
  }

  // Purpose: signup if email not yet verified, otherwise login.
  const purpose = resolved.user.emailVerifiedAt ? "web_login" : "signup_verify_email";

  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  const result = await verifyOtp({
    userId: resolved.userId,
    purpose,
    code,
    expectedSessionIdHash: resolved.sessionIdHash,
  });

  if (!result.ok) {
    await logSecurityEvent({
      kind: result.reason === "exhausted" ? "user.otp.exhausted" : "user.otp.fail",
      tenantId: resolved.tenantId,
      userId: resolved.userId,
      ip,
      userAgent: ua,
      payload: { reason: result.reason, purpose },
    });
    const msg =
      result.reason === "expired"
        ? "Code expired. Request a new one."
        : result.reason === "exhausted"
          ? "Too many wrong attempts. Request a new code."
          : "Incorrect code.";
    return NextResponse.json({ error: msg, reason: result.reason }, { status: 401 });
  }

  await markSessionOtpVerified(resolved.sessionIdHash);

  // First-time email verification.
  if (purpose === "signup_verify_email") {
    await db
      .update(users)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(users.id, resolved.userId));
    await logSecurityEvent({
      kind: "user.email_verified",
      tenantId: resolved.tenantId,
      userId: resolved.userId,
      ip,
      userAgent: ua,
    });
  }

  await logSecurityEvent({
    kind: "user.otp.ok",
    tenantId: resolved.tenantId,
    userId: resolved.userId,
    ip,
    userAgent: ua,
    payload: { purpose, scope },
  });

  // Where to send the user next.
  const redirect = scope === "admin" ? "/admin" : `/${resolved.user.locale}/app/dashboard`;
  return NextResponse.json({ ok: true, redirect }, { status: 200 });
}
