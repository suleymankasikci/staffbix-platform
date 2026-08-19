import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tenants } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { stripe } from "@/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Billing Portal session for the Owner to:
 *   - View past invoices + receipts
 *   - Update payment method
 *   - Cancel / downgrade the subscription
 *
 * Returns `{ url }` — caller redirects there. Stripe sends the user
 * back to `PUBLIC_APP_URL/${locale}/app/settings/billing`.
 */
export async function POST(_req: NextRequest): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "Owner") {
    return NextResponse.json({ error: "Only the Owner can manage billing" }, { status: 403 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "POST /api/billing/portal",
  });
  if (t) return t;

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, session.tenantId))
    .limit(1);
  if (!tenant || !tenant.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer for this tenant" },
      { status: 500 },
    );
  }

  const appUrl = process.env.PUBLIC_APP_URL ?? "http://localhost:3000";
  const returnUrl = `${appUrl}/${session.user.locale}/app/settings/billing`;
  const portal = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: returnUrl,
  });
  return NextResponse.json({ ok: true, url: portal.url });
}
