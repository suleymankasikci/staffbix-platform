import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { getClientIp, getUserAgent, readJson } from "@/lib/auth/request";
import { logSecurityEvent } from "@/lib/audit/log";
import { verifyPassword } from "@/lib/auth/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DisableBody {
  password?: string;
}

/**
 * POST /api/me/totp/disable
 *
 * Turn off TOTP for the signed-in customer. Requires re-authentication
 * via the account password (defence in depth — losing a phone is the
 * usual trigger, and we don't want a stolen session to silently strip
 * the second factor).
 *
 * Auth: requireApp + password. Rate-limited per tenant. Emits
 * `user.totp.disabled`. The secret blob, enrolled timestamp, and
 * recovery codes are all cleared.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "POST /api/me/totp/disable",
  });
  if (t) return t;

  const body = await readJson<DisableBody>(req);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json(
      { error: "Password is required to disable TOTP." },
      { status: 400 },
    );
  }

  if (!session.user.passwordHash) {
    // Invited user with no password yet — can't pass the password
    // challenge and also shouldn't have TOTP enabled. Refuse.
    return NextResponse.json(
      { error: "Cannot disable TOTP without a password set." },
      { status: 409 },
    );
  }

  const passwordOk = await verifyPassword(
    session.user.passwordHash,
    password,
  );
  if (!passwordOk) {
    return NextResponse.json(
      { error: "Password is incorrect." },
      { status: 401 },
    );
  }

  if (!session.user.totpEnrolledAt && !session.user.totpSecretBlob) {
    return NextResponse.json(
      { ok: true, alreadyDisabled: true },
      { status: 200 },
    );
  }

  try {
    await db
      .update(users)
      .set({
        totpSecretBlob: null,
        totpEnrolledAt: null,
        totpRecoveryCodes: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.userId));

    await logSecurityEvent({
      kind: "user.totp.disabled",
      tenantId: session.tenantId,
      userId: session.userId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: { actorUserId: session.userId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[me.totp.disable] failed", err);
    return NextResponse.json(
      { error: "Could not disable TOTP." },
      { status: 500 },
    );
  }
}
