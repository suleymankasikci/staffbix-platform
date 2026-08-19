import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tenants, plans } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { readJson } from "@/lib/auth/request";
import { stripe } from "@/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  /** Plan id to subscribe to ("growth", "business"). Enterprise is sales-quoted. */
  planId?: string;
  /** Where to send the user after success / cancel. */
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout session for the caller's tenant to upgrade
 * to the requested plan. Owner-only. Returns `{ url }` — caller
 * window.location's to it.
 *
 * The Stripe Customer was already created at signup (Sprint 2), so we
 * pass `customer: ...` rather than `customer_email: ...` to avoid
 * creating a duplicate.
 *
 * Sprint 11 production: plan.stripePriceId must be populated for each
 * plan (run `scripts/seed-stripe-prices.ts` once after creating the
 * Stripe products in the dashboard). When stripePriceId is NULL we
 * 503 with a helpful error so the operator knows what to do.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "Owner") {
    return NextResponse.json({ error: "Only the Owner can change the plan" }, { status: 403 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "POST /api/billing/checkout",
  });
  if (t) return t;

  const body = await readJson<Body>(req);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const planId = typeof body.planId === "string" ? body.planId : "";

  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, planId))
    .limit(1);
  if (!plan) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  if (plan.id === "enterprise") {
    return NextResponse.json(
      { error: "Enterprise is sales-quoted — contact support@staffbix.com" },
      { status: 400 },
    );
  }
  if (!plan.stripePriceId) {
    return NextResponse.json(
      {
        error: `Plan ${plan.id} isn't wired in Stripe yet. Run scripts/seed-stripe-prices.ts.`,
      },
      { status: 503 },
    );
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, session.tenantId))
    .limit(1);
  if (!tenant || !tenant.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer for this tenant — contact support" },
      { status: 500 },
    );
  }

  const appUrl = process.env.PUBLIC_APP_URL ?? "http://localhost:3000";
  const successUrl =
    typeof body.successUrl === "string" && body.successUrl.startsWith(appUrl)
      ? body.successUrl
      : `${appUrl}/${session.user.locale}/app/settings/billing?success=1`;
  const cancelUrl =
    typeof body.cancelUrl === "string" && body.cancelUrl.startsWith(appUrl)
      ? body.cancelUrl
      : `${appUrl}/${session.user.locale}/app/settings/billing?cancel=1`;

  const taxEnabled = process.env.STRIPE_TAX_ENABLED === "true";
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: tenant.stripeCustomerId,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    automatic_tax: { enabled: taxEnabled },
    // Automatic tax requires a billing address on the Customer. Customers
    // are created at signup WITHOUT an address, so without this Stripe
    // 400s ("Automatic tax calculation in Checkout requires a valid
    // address on the Customer"). `address: "auto"` makes Checkout collect
    // the address on the hosted page and persist it to the Customer.
    ...(taxEnabled ? { customer_update: { address: "auto" } } : {}),
    metadata: {
      staffbix_tenant_id: tenant.id,
      staffbix_target_plan: plan.id,
    },
    subscription_data: {
      metadata: {
        staffbix_tenant_id: tenant.id,
        staffbix_target_plan: plan.id,
      },
    },
  });

  if (!checkout.url) {
    return NextResponse.json({ error: "Stripe returned no checkout URL" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, url: checkout.url, sessionId: checkout.id });
}
