import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, staff, tenants } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
  SESSION_COOKIE_MAX_AGE,
} from "@/lib/auth/session";
import { issueOtp } from "@/lib/auth/otp";
import { hashToken } from "@/lib/auth/tokens";
import {
  getClientIp,
  getUserAgent,
  getDeviceFingerprint,
  readJson,
  normalizeEmail,
} from "@/lib/auth/request";
import { consume } from "@/lib/auth/rate-limit";
import { normalizeLocale } from "@/lib/i18n/config";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";
import { queueEmail, buildOtpMessage } from "@/lib/mail/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 30;

interface LoginBody {
  email?: string;
  password?: string;
  scope?: "app" | "admin";
  /** Optional tenant id for users with accounts at multiple tenants. */
  tenantId?: string;
}

const UUID_RE = /^[0-9a-f-]{36}$/;

/**
 * POST /api/auth/login
 *
 * Password check → OTP-pending session. The session cookie is set
 * immediately, but the user must enter the emailed OTP via
 * POST /api/auth/otp/verify before any protected route loads.
 *
 * `scope` selects between the customer site (`app`, cookie `staffbix_sid`)
 * and the staff admin panel (`admin`, cookie `staffbix_admin_sid`).
 * In admin scope the user must have `role = "Owner"` OR be flagged as
 * platform staff (Sprint 1.5 adds a `staff` table; for now Owners can
 * use admin during early dogfooding).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);
  const ua = getUserAgent(req);
  const fingerprint = await getDeviceFingerprint(req);

  // Sprint 12 — general API throttle before we hit the per-email limit.
  // Same-IP burst (credential-stuffing, password-spray) is the target.
  const throttled = await rateLimitOr429("api", `ip:${ip ?? "unknown"}`, {
    ip,
    userAgent: ua,
    route: "POST /api/auth/login",
  });
  if (throttled) return throttled;

  const body = await readJson<LoginBody>(req);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const scope: "app" | "admin" = body.scope === "admin" ? "admin" : "app";
  const requestedTenantId =
    typeof body.tenantId === "string" && UUID_RE.test(body.tenantId)
      ? body.tenantId
      : null;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  // Rate-limit per email (anti-credential-stuffing) AND per IP elsewhere.
  const limit = await consume("login", email);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  // Look up by email. There may be multiple rows (one per tenant). If
  // the caller didn't pick one we surface a `pick_tenant` step. The
  // password is verified against the FIRST candidate row's hash so the
  // tenant picker can still kick in even before identity is proven —
  // we never leak which tenants the email belongs to before that.
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email)))
    .limit(10);

  // Constant-time fake hash check when the user doesn't exist — prevents
  // a timing oracle on which emails are registered.
  const FAKE_HASH =
    "$argon2id$v=19$m=65536,t=3,p=4$YWFhYWFhYWFhYWFhYWFhYQ$Yg7HCi3F0p9Q6P6KqQ1xWzqIxhJqGqIyG3HQk1y0Yqk";
  if (rows.length === 0) {
    await verifyPassword(FAKE_HASH, password);
    await logSecurityEvent({ kind: "user.login.password_fail", ip, userAgent: ua, payload: { email } });
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  // Pick the candidate row:
  //  - If caller supplied tenantId, use the row matching it.
  //  - Else pick the first Active row, falling back to the first row.
  // (Multi-tenant users will be asked to call back with a tenantId
  // after the OTP step or via the picker UI.)
  let user = rows[0];
  if (requestedTenantId) {
    const match = rows.find((r) => r.tenantId === requestedTenantId);
    if (!match) {
      return NextResponse.json(
        { error: "Email or password is incorrect." },
        { status: 401 },
      );
    }
    user = match;
  } else {
    user = rows.find((r) => r.status === "Active") ?? rows[0];
  }
  if (user.status === "Banned") {
    return NextResponse.json({ error: "This account is locked. Contact support." }, { status: 403 });
  }
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return NextResponse.json(
      { error: "Account temporarily locked. Try again later." },
      { status: 423 },
    );
  }

  const passwordOk = user.passwordHash
    ? await verifyPassword(user.passwordHash, password)
    : false;

  if (!passwordOk) {
    const nextCount = user.failedLoginCount + 1;
    const lockedUntil =
      nextCount >= LOCKOUT_THRESHOLD
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
        : null;
    await db
      .update(users)
      .set({ failedLoginCount: nextCount, lockedUntil })
      .where(eq(users.id, user.id));
    await logSecurityEvent({
      kind: lockedUntil ? "user.login.locked" : "user.login.password_fail",
      tenantId: user.tenantId,
      userId: user.id,
      ip,
      userAgent: ua,
    });
    return NextResponse.json(
      lockedUntil
        ? { error: "Too many failed attempts. Account locked for 30 minutes." }
        : { error: "Email or password is incorrect." },
      { status: 401 },
    );
  }

  // Admin scope guard (L-17). Require an Active row in the platform
  // `staff` table. Owner role on a tenant no longer implies admin
  // access — staff must be provisioned explicitly. In NODE_ENV !==
  // 'production' an Owner is still allowed through so dev tenants
  // can dogfood without a separate staff entry.
  if (scope === "admin") {
    const [staffRow] = await db
      .select({ id: staff.id, status: staff.status })
      .from(staff)
      .where(eq(staff.email, email))
      .limit(1);
    const isActiveStaff = staffRow?.status === "active";
    const isDevOwnerFallback =
      process.env.NODE_ENV !== "production" && user.role === "Owner";
    if (!isActiveStaff && !isDevOwnerFallback) {
      return NextResponse.json({ error: "Staff access only." }, { status: 403 });
    }
  }

  // If the user belongs to multiple tenants AND no tenant was specified
  // AND we're on the customer-app scope (admin uses the staff table,
  // not tenant identity), ask the client to pick one. We send back the
  // minimal {id, name, slug} per tenant. Password is already verified
  // so this doesn't leak — the picker is post-auth.
  if (scope === "app" && !requestedTenantId && rows.length > 1) {
    const tenantIds = Array.from(new Set(rows.map((r) => r.tenantId)));
    const tenantRows = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
      })
      .from(tenants);
    const choices = tenantRows
      .filter((t) => tenantIds.includes(t.id))
      .map((t) => ({ id: t.id, name: t.name, slug: t.slug }));
    if (choices.length > 1) {
      return NextResponse.json({
        ok: true,
        nextStep: "pick_tenant",
        tenants: choices,
      });
    }
  }

  // Reset failed counter on success.
  if (user.failedLoginCount > 0 || user.lockedUntil) {
    await db
      .update(users)
      .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() })
      .where(eq(users.id, user.id));
  } else {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));
  }

  // OTP-pending session.
  const { token } = await createSession({
    userId: user.id,
    tenantId: user.tenantId,
    ip,
    userAgent: ua,
    deviceFingerprint: fingerprint,
  });
  const sessionIdHash = hashToken(token);

  const { code } = await issueOtp({
    userId: user.id,
    purpose: "web_login",
    bindSessionIdHash: sessionIdHash,
  });
  await queueEmail({
    idemKey: `login-otp:${user.id}:${sessionIdHash.slice(0, 12)}`,
    message: buildOtpMessage({ to: email, code, purpose: "login", ttlMinutes: 10, locale: normalizeLocale(user.locale) ?? "en" }),
    tenantId: user.tenantId,
    userId: user.id,
  });

  await Promise.all([
    logSecurityEvent({
      kind: "user.login.password_ok",
      tenantId: user.tenantId,
      userId: user.id,
      ip,
      userAgent: ua,
      payload: { scope },
    }),
    logSecurityEvent({
      kind: "user.otp.issued",
      tenantId: user.tenantId,
      userId: user.id,
      ip,
      userAgent: ua,
      payload: { purpose: "web_login", scope },
    }),
  ]);

  const cookieName = scope === "admin" ? ADMIN_SESSION_COOKIE : SESSION_COOKIE;
  const jar = await cookies();
  jar.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });

  // Sprint 18 — customer TOTP opt-in. If this user has completed TOTP
  // enrolment they can verify with either email OTP (default) or a TOTP
  // code via /api/auth/totp/verify-login. The client UI uses
  // `totpAvailable` to decide whether to surface a "use authenticator
  // app" affordance on the verify screen.
  const totpAvailable = Boolean(user.totpEnrolledAt && user.totpSecretBlob);

  return NextResponse.json(
    { ok: true, nextStep: "verify", scope, totpAvailable },
    { status: 200 },
  );
}
