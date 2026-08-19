import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { getClientIp, getUserAgent, readJson } from "@/lib/auth/request";
import { logSecurityEvent } from "@/lib/audit/log";
import { verifyTotp } from "@/lib/auth/totp";
import { decryptForTenantString } from "@/lib/crypto/encrypt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface VerifyBody {
  code?: string;
}

/**
 * POST /api/me/totp/verify
 *
 * Completes a pending TOTP enrolment. The user has already received the
 * secret + recovery codes from /api/me/totp/enroll and entered the URI
 * into their authenticator app. They now submit a generated 6-digit
 * code to prove they have the secret. On success we stamp
 * `totp_enrolled_at = now()`.
 *
 * Auth: requireApp. Rate-limited per tenant. Emits `user.totp.ok` on
 * success, `user.totp.fail` otherwise.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "POST /api/me/totp/verify",
  });
  if (t) return t;

  const body = await readJson<VerifyBody>(req);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "Enter the 6-digit code." },
      { status: 400 },
    );
  }

  if (!session.user.totpSecretBlob) {
    return NextResponse.json(
      { error: "Start enrolment first via /api/me/totp/enroll." },
      { status: 409 },
    );
  }

  try {
    const secretB64 = await decryptForTenantString(
      session.tenantId,
      session.user.totpSecretBlob,
    );
    const secret = Buffer.from(secretB64, "base64");

    if (!verifyTotp(secret, code)) {
      await logSecurityEvent({
        kind: "user.totp.fail",
        tenantId: session.tenantId,
        userId: session.userId,
        ip: getClientIp(req),
        userAgent: getUserAgent(req),
        payload: { phase: "enrollment_verify" },
      });
      return NextResponse.json(
        { error: "Code did not match. Try again." },
        { status: 401 },
      );
    }

    await db
      .update(users)
      .set({ totpEnrolledAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, session.userId));

    await logSecurityEvent({
      kind: "user.totp.ok",
      tenantId: session.tenantId,
      userId: session.userId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: { phase: "enrollment_verify" },
    });

    return NextResponse.json({ ok: true, enrolled: true });
  } catch (err) {
    console.error("[me.totp.verify] failed", err);
    return NextResponse.json(
      { error: "Could not verify code." },
      { status: 500 },
    );
  }
}
