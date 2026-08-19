import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { tenants, users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { normalizeLocale } from "@/lib/i18n/config";
import {
  createSession,
  SESSION_COOKIE,
  SESSION_COOKIE_MAX_AGE,
} from "@/lib/auth/session";
import { issueOtp } from "@/lib/auth/otp";
import { hashToken } from "@/lib/auth/tokens";
import { generateUniqueSlug } from "@/lib/auth/slug";
import {
  getClientIp,
  getUserAgent,
  getDeviceFingerprint,
  readJson,
  normalizeEmail,
} from "@/lib/auth/request";
import { consume } from "@/lib/auth/rate-limit";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";
import { stripe } from "@/lib/stripe/client";
import { queueEmail, buildOtpMessage } from "@/lib/mail/send";
import { notifyAdminOfSignup } from "@/lib/mail/admin-notify";
import { scheduleOnboardingDrip } from "@/lib/onboarding/drip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RegisterBody {
  email?: string;
  password?: string;
  name?: string;
  companyName?: string;
  locale?: string;
  country?: string;
}

/**
 * POST /api/auth/register
 *
 * Creates a tenant + owner user + Stripe customer in one transaction,
 * then issues an unverified session and emails a signup OTP.
 *
 * Returns the OTP-pending session cookie. The UI redirects to /verify,
 * which calls POST /api/auth/otp/verify to upgrade the session.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);
  const ua = getUserAgent(req);
  const fingerprint = await getDeviceFingerprint(req);

  // Sprint 12 — general per-IP throttle layered ABOVE the long-window
  // register limit; cuts off bursty noise within a minute.
  const burst = await rateLimitOr429("api", `ip:${ip ?? "unknown"}`, {
    ip,
    userAgent: ua,
    route: "POST /api/auth/register",
  });
  if (burst) return burst;

  // Rate-limit on IP — same IP can't farm 1000 trial signups.
  const limit = await consume("register", ip ?? "unknown");
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many sign-ups from this network. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const body = await readJson<RegisterBody>(req);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
  const locale = typeof body.locale === "string" && /^[a-z]{2}$/.test(body.locale) ? body.locale : "en";
  const country = typeof body.country === "string" ? body.country.slice(0, 2).toUpperCase() : null;

  if (!email) return NextResponse.json({ error: "Email looks invalid." }, { status: 400 });
  if (password.length < 12) {
    return NextResponse.json({ error: "Password must be at least 12 characters." }, { status: 400 });
  }
  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!companyName || companyName.length > 120) {
    return NextResponse.json({ error: "Please enter your company name." }, { status: 400 });
  }

  // Hash + slug *before* opening the transaction so we don't hold a row
  // lock during a slow argon2 hash (which can take 200ms+).
  const passwordHash = await hashPassword(password);
  const slug = await generateUniqueSlug(companyName);

  // Create the Stripe customer outside the DB transaction. If the DB
  // step fails after this, we still have a dangling Stripe customer —
  // we'll clean those up via a nightly reconciliation job in Sprint 11
  // (it's far cheaper than the inverse: a tenant with no Stripe link).
  let stripeCustomerId: string;
  try {
    const customer = await stripe.customers.create({
      email,
      name: companyName,
      metadata: { staffbix_slug: slug, owner_name: name },
    });
    stripeCustomerId = customer.id;
  } catch (e) {
    console.error("[register] Stripe customer create failed:", e);
    await logSecurityEvent({
      kind: "tenant.created",
      ip,
      userAgent: ua,
      payload: { error: "stripe_failed", email, slug },
    });
    return NextResponse.json(
      { error: "Could not initialize billing. Please try again." },
      { status: 502 },
    );
  }

  // Insert tenant + user in a real DB transaction.
  let tenantId: string;
  let userId: string;
  try {
    const result = await db.transaction(async (tx) => {
      const [tenant] = await tx
        .insert(tenants)
        .values({
          slug,
          name: companyName,
          country,
          locale,
          stripeCustomerId,
          status: "trialing",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60_000),
        })
        .returning();

      const [user] = await tx
        .insert(users)
        .values({
          tenantId: tenant.id,
          email,
          passwordHash,
          name,
          locale,
          role: "Owner",
          status: "Active",
        })
        .returning();

      return { tenant, user };
    });
    tenantId = result.tenant.id;
    userId = result.user.id;
  } catch (e: unknown) {
    const err = e as {
      cause?: { code?: string; constraint_name?: string };
      code?: string;
      constraint_name?: string;
    };
    const innerCode = err.cause?.code ?? err.code;
    const innerConstraint = err.cause?.constraint_name ?? err.constraint_name ?? "";
    if (innerCode === "23505" && innerConstraint.includes("users_tenant_email")) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }
    console.error("[register] tx failed:", e);
    return NextResponse.json({ error: "Sign-up failed. Please try again." }, { status: 500 });
  }

  // Issue an OTP-pending session.
  const { token } = await createSession({
    userId,
    tenantId,
    ip,
    userAgent: ua,
    deviceFingerprint: fingerprint,
  });

  // Email OTP for signup verification.
  const { code } = await issueOtp({
    userId,
    purpose: "signup_verify_email",
    bindSessionIdHash: hashToken(token),
  });
  await queueEmail({
    idemKey: `signup-otp:${userId}:${Date.now()}`,
    message: buildOtpMessage({ to: email, code, purpose: "signup", ttlMinutes: 10, locale: normalizeLocale(locale) ?? "en" }),
    tenantId,
    userId,
  });

  await Promise.all([
    logSecurityEvent({ kind: "tenant.created", tenantId, ip, userAgent: ua, payload: { slug } }),
    logSecurityEvent({ kind: "user.signup", tenantId, userId, ip, userAgent: ua }),
    logSecurityEvent({ kind: "user.otp.issued", tenantId, userId, ip, userAgent: ua, payload: { purpose: "signup_verify_email" } }),
  ]);

  // Schedule the 5-touch onboarding drip. Wrapped so a queue outage does
  // NOT fail signup — the user still gets their OTP, the tenant still
  // exists, and a future signup reconciliation can backfill missing drips.
  try {
    await scheduleOnboardingDrip({
      tenantId,
      userEmail: email,
      userName: name,
      locale: normalizeLocale(locale) ?? "en",
    });
  } catch (err) {
    console.error(
      "[register] scheduleOnboardingDrip failed (non-fatal):",
      err instanceof Error ? err.message : err,
    );
  }

  // Fire-and-forget admin notification — every new signup pings the
  // platform team. notifyAdminOfSignup swallows its own errors so a
  // mail-infra hiccup never returns a 500 to the new user.
  await notifyAdminOfSignup({
    tenantId,
    tenantSlug: slug,
    tenantName: companyName || name,
    ownerEmail: email,
    ownerName: name,
    ip,
    country,
    locale,
    signedUpAtIso: new Date().toISOString(),
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });

  return NextResponse.json({ ok: true, nextStep: "verify" }, { status: 200 });
}
