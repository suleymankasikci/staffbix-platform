import { NextResponse } from "next/server";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/me
 *
 * Returns the signed-in user + their tenant. Used by every page that
 * needs to know "who am I" without an extra DB round-trip in the
 * component tree.
 *
 * Returns 401 if no verified session. Components handle that as "redirect
 * to /login".
 */
export async function GET(): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "GET /api/me",
  });
  if (t) return t;
  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      locale: session.user.locale,
      emailVerifiedAt: session.user.emailVerifiedAt,
      lastLoginAt: session.user.lastLoginAt,
      // Sprint 18 — surfaced for the Security settings page so it can
      // toggle between "Enable TOTP" and "Disable TOTP" affordances.
      totpEnrolledAt: session.user.totpEnrolledAt,
    },
    tenant: {
      id: session.tenant.id,
      slug: session.tenant.slug,
      name: session.tenant.name,
      planId: session.tenant.planId,
      status: session.tenant.status,
      locale: session.tenant.locale,
      timezone: session.tenant.timezone,
      country: session.tenant.country,
      trialEndsAt: session.tenant.trialEndsAt,
    },
  });
}
