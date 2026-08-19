import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "../db/client";
import { sessions, users, tenants } from "../db/schema";
import {
  generateSessionToken,
  hashToken,
} from "./tokens";

/**
 * Session lifecycle helpers.
 *
 * A session is created during login but is marked **otp_pending** (i.e.
 * `otp_verified_at IS NULL`) until the user enters a valid OTP. The
 * cookie is set immediately on login so the OTP page can read the
 * session via the cookie — but no protected route grants access until
 * `otp_verified_at` is set.
 *
 * Sessions are stored hashed (SHA-256 + pepper). The opaque token from
 * `generateSessionToken()` is the *only* thing the client ever sees.
 */

const SESSION_TTL_DAYS = 14;

export interface CreateSessionInput {
  userId: string;
  tenantId: string;
  ip: string | null;
  userAgent: string | null;
  deviceFingerprint: string | null;
}

/** Returns the opaque token to set as the cookie value. */
export async function createSession(input: CreateSessionInput): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = generateSessionToken();
  const idHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60_000);

  await db.insert(sessions).values({
    idHash,
    userId: input.userId,
    tenantId: input.tenantId,
    ip: input.ip,
    userAgent: input.userAgent,
    deviceFingerprint: input.deviceFingerprint,
    expiresAt,
  });

  return { token, expiresAt };
}

export interface ResolvedSession {
  sessionIdHash: string;
  userId: string;
  tenantId: string;
  otpVerified: boolean;
  user: typeof users.$inferSelect;
  tenant: typeof tenants.$inferSelect;
}

/**
 * Look up a session by its plaintext token. Returns null if the session
 * is missing, revoked, or expired. Returned object reveals whether the
 * OTP step is complete (`otpVerified`).
 */
export async function resolveSession(token: string): Promise<ResolvedSession | null> {
  const idHash = hashToken(token);
  const rows = await db
    .select({ session: sessions, user: users, tenant: tenants })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(tenants, eq(tenants.id, sessions.tenantId))
    .where(
      and(
        eq(sessions.idHash, idHash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    sessionIdHash: row.session.idHash,
    userId: row.user.id,
    tenantId: row.tenant.id,
    otpVerified: row.session.otpVerifiedAt !== null,
    user: row.user,
    tenant: row.tenant,
  };
}

export async function markSessionOtpVerified(idHash: string): Promise<void> {
  await db
    .update(sessions)
    .set({ otpVerifiedAt: new Date() })
    .where(eq(sessions.idHash, idHash));
}

export async function revokeSession(idHash: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.idHash, idHash));
}

export async function revokeAllSessionsForUser(userId: string): Promise<number> {
  const res = await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  // `postgres-js` doesn't return affected count by default for UPDATE; we
  // can fetch via .returning() but for now the count isn't load-bearing.
  return (res as unknown as { count?: number }).count ?? 0;
}

/**
 * Cookie name. HttpOnly, Secure, SameSite=Lax.
 *
 * Two cookies, not one: `staffbix_sid` is the live session token used by
 * the customer site, `staffbix_admin_sid` is a parallel cookie used by
 * the staff-only `/admin/*` segment. Same shape, different name — so the
 * admin session survives even when the customer session is revoked, and
 * vice versa.
 */
export const SESSION_COOKIE = "staffbix_sid";
export const ADMIN_SESSION_COOKIE = "staffbix_admin_sid";
export const SESSION_COOKIE_MAX_AGE = SESSION_TTL_DAYS * 24 * 60 * 60;
