import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { getClientIp, getUserAgent } from "@/lib/auth/request";
import { logSecurityEvent } from "@/lib/audit/log";
import {
  generateTotpSecret,
  generateRecoveryCodes,
  totpUri,
} from "@/lib/auth/totp";
import { encryptForTenant } from "@/lib/crypto/encrypt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/me/totp/enroll
 *
 * Begin TOTP enrolment for the signed-in customer. Generates a fresh
 * 20-byte secret + 10 recovery codes, stores the secret encrypted under
 * the tenant DEK, but leaves `totp_enrolled_at` NULL. The user must
 * complete /api/me/totp/verify with a valid 6-digit code before TOTP
 * is treated as enabled on the account.
 *
 * Auth: requireApp (active session). Rate-limited per tenant. Emits
 * `user.totp.enrolled` (issued, awaiting verify).
 *
 * Response:
 *   {
 *     ok: true,
 *     secret_base32: "JBSWY3DPEHPK3PXP…",
 *     otpauth_uri:   "otpauth://totp/Staffbix:user@example.com?…",
 *     recovery_codes: ["XXXXXXX","…"]  // shown to user ONCE
 *   }
 *
 * If the user already has a confirmed TOTP enrolment we refuse with 409;
 * disable + re-enroll is the supported path for re-keying.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "POST /api/me/totp/enroll",
  });
  if (t) return t;

  if (session.user.totpEnrolledAt) {
    return NextResponse.json(
      { error: "TOTP is already enabled. Disable it first to re-enroll." },
      { status: 409 },
    );
  }

  try {
    const { secret, base32 } = generateTotpSecret();
    const { plain, hashed } = generateRecoveryCodes();

    const blob = await encryptForTenant(session.tenantId, secret.toString("base64"));

    await db
      .update(users)
      .set({
        // Buffer<-Uint8Array — drizzle's bytea customType expects this.
        totpSecretBlob: Buffer.from(blob),
        totpRecoveryCodes: hashed,
        totpEnrolledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.userId));

    await logSecurityEvent({
      kind: "user.totp.enrolled",
      tenantId: session.tenantId,
      userId: session.userId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: { phase: "issued" },
    });

    const otpauthUri = totpUri({
      secret: base32,
      account: session.user.email,
      issuer: "Staffbix",
    });

    return NextResponse.json({
      ok: true,
      secret_base32: base32,
      otpauth_uri: otpauthUri,
      recovery_codes: plain,
    });
  } catch (err) {
    console.error("[me.totp.enroll] failed", err);
    return NextResponse.json(
      { error: "Could not start TOTP enrolment." },
      { status: 500 },
    );
  }
}
