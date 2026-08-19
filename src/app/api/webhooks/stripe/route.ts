import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe/client";
import { db } from "@/lib/db/client";
import { tenants, platformInvoices } from "@/lib/db/schema";
import { stripeWebhookQueue } from "@/lib/queue/queues";
import { logSecurityEvent } from "@/lib/audit/log";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/stripe
 *
 * The Stripe webhook contract:
 *   1. Verify `Stripe-Signature` against the raw body. If it fails →
 *      400 immediately. NEVER log the body; treat it as untrusted.
 *   2. Acknowledge with 200 inside 5 seconds. Stripe retries on timeout
 *      or 5xx — we don't want to be the slow link.
 *   3. Update `tenant.status` synchronously for the subset of events
 *      we know how to handle quickly (subscription create/update/delete
 *      and trial_will_end). Everything else gets enqueued onto BullMQ
 *      for the worker.
 *
 * Stripe events that flow through here (must match the Dashboard
 * webhook endpoint configuration — see docs/05 §0 + the project README):
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - customer.subscription.trial_will_end
 *   - invoice.paid
 *   - invoice.payment_failed
 *   - invoice.upcoming
 *   - customer.updated
 *   - payment_method.attached
 *   - charge.refunded
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (!WEBHOOK_SECRET) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET missing — refusing all events.");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Sprint 12 — webhook bucket (1000/min). Stripe legitimately bursts
  // during invoice runs; the cap is generous but stops an unsigned
  // flood from chewing CPU/db before the signature check.
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const cf = req.headers.get("cf-connecting-ip") ?? "";
  const ip = cf || xff.split(",")[0]?.trim() || "unknown";
  const throttled = await rateLimitOr429("webhook", `stripe:${ip}`, {
    ip,
    route: "POST /api/webhooks/stripe",
  });
  if (throttled) return throttled;

  // Read straight off the Request — works both inside Next's request
  // scope and from the audit script's synthetic-Request invocations.
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  // Raw body — must NOT be parsed before signature verification.
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "signature error";
    console.warn("[stripe-webhook] signature verification failed:", msg);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Reject events older than 5 minutes (Stripe default tolerance) — the
  // SDK already does this inside constructEvent, but be defensive.
  const ageSec = Math.floor(Date.now() / 1000) - event.created;
  if (ageSec > 600) {
    console.warn(`[stripe-webhook] stale event ${event.id} age=${ageSec}s`);
    // Still return 200 so Stripe doesn't keep retrying.
    return NextResponse.json({ received: true, stale: true });
  }

  // Hot-path: subscription status changes update tenant.status NOW so
  // the UX reflects reality even if the worker queue is lagging.
  try {
    await handleHotPath(event);
  } catch (err) {
    console.error("[stripe-webhook] hot-path failed for", event.type, event.id, err);
    // Don't fail the request — let Stripe think we got it, the queued
    // job will retry the slow parts.
  }

  // Cold-path: everything goes to the worker for idempotent processing
  // (email notifications, audit log enrichment, downstream side-effects).
  await stripeWebhookQueue.add(event.id, { eventId: event.id, event }, { jobId: event.id });

  return NextResponse.json({ received: true });
}

async function handleHotPath(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.trial_will_end": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const next = mapSubscriptionStatus(sub.status, event.type);
      // If the subscription metadata carries a target plan, advance the
      // tenant's plan_id too. Checkout sets staffbix_target_plan in
      // subscription_data.metadata.
      const targetPlan =
        typeof sub.metadata?.staffbix_target_plan === "string"
          ? sub.metadata.staffbix_target_plan
          : null;
      const setShape: { status: typeof next; updatedAt: Date; planId?: string } = {
        status: next,
        updatedAt: new Date(),
      };
      if (
        targetPlan &&
        event.type !== "customer.subscription.deleted" &&
        ["starter", "growth", "business", "enterprise"].includes(targetPlan)
      ) {
        setShape.planId = targetPlan;
      }
      const rows = await db
        .update(tenants)
        .set(setShape)
        .where(eq(tenants.stripeCustomerId, customerId))
        .returning({ id: tenants.id });
      const tenantId = rows[0]?.id;
      await logSecurityEvent({
        kind: next === "suspended" ? "tenant.suspended" : "tenant.reactivated",
        tenantId: tenantId ?? null,
        payload: {
          stripeEventId: event.id,
          stripeEventType: event.type,
          stripeStatus: sub.status,
          stripeCustomerId: customerId,
          targetPlan,
        },
      });
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.created":
    case "invoice.finalized":
    case "invoice.voided": {
      await upsertInvoice(event);
      break;
    }
    case "charge.refunded": {
      // The v22 SDK doesn't expose `Charge.invoice` as a typed field —
      // it lives on the resource if `expand=['invoice']` was requested
      // at retrieve time. Stripe sends a separate `invoice.updated` (or
      // `invoice.payment_failed` → `invoice.voided`) event when the
      // invoice itself transitions, which `upsertInvoice` above covers.
      //
      // Hot-path here: just emit an audit row so the operator dashboard
      // shows the refund event. The cold-path BullMQ worker will fetch
      // the charge with expand=invoice in Sprint 12 when we need a
      // dedicated refund-aware admin view.
      const charge = event.data.object as Stripe.Charge;
      await logSecurityEvent({
        kind: "refund.processed",
        payload: {
          subject: "refund.processed",
          stripeEventId: event.id,
          stripeEventType: event.type,
          chargeId: charge.id,
          amountRefunded: charge.amount_refunded,
        },
      });
      break;
    }
    default:
      // Everything else handled by the worker.
      break;
  }
}

/**
 * Upsert a `platform_invoices` row from a Stripe invoice event. Idempotent
 * on (stripe_invoice_id) — re-delivering the same event is a no-op.
 */
async function upsertInvoice(event: Stripe.Event): Promise<void> {
  const inv = event.data.object as Stripe.Invoice;
  if (!inv.id) return;
  const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
  if (!customerId) return;

  // Find the matching tenant
  const [tenantRow] = await db
    .select({ id: tenants.id, planId: tenants.planId })
    .from(tenants)
    .where(eq(tenants.stripeCustomerId, customerId))
    .limit(1);
  if (!tenantRow) return; // unknown tenant — ignore

  // Map Stripe status → our enum
  const status: typeof platformInvoices.$inferInsert.status = (() => {
    if (event.type === "invoice.voided") return "void";
    if (event.type === "invoice.payment_failed") return "failed";
    if (event.type === "invoice.paid") return "paid";
    if (inv.status === "open") return "open";
    if (inv.status === "paid") return "paid";
    if (inv.status === "void") return "void";
    if (inv.status === "uncollectible") return "past_due";
    return "draft";
  })();

  const issuedAt =
    typeof inv.created === "number" ? new Date(inv.created * 1000) : new Date();
  const paidAt =
    inv.status_transitions?.paid_at != null
      ? new Date(inv.status_transitions.paid_at * 1000)
      : null;
  const lastFailedAt =
    event.type === "invoice.payment_failed" ? new Date() : null;

  await db
    .insert(platformInvoices)
    .values({
      tenantId: tenantRow.id,
      stripeInvoiceId: inv.id,
      planId: tenantRow.planId,
      amountCents: inv.amount_due ?? 0,
      currency: inv.currency ?? "usd",
      status,
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
      pdfUrl: inv.invoice_pdf ?? null,
      issuedAt,
      paidAt,
      lastFailedAt,
      metadata: { stripeEventType: event.type, stripeEventId: event.id },
    })
    .onConflictDoUpdate({
      target: platformInvoices.stripeInvoiceId,
      set: {
        status,
        hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
        pdfUrl: inv.invoice_pdf ?? null,
        amountCents: inv.amount_due ?? 0,
        paidAt: paidAt ?? undefined,
        lastFailedAt: lastFailedAt ?? undefined,
        updatedAt: new Date(),
      },
    });
}

function mapSubscriptionStatus(
  s: Stripe.Subscription.Status,
  eventType: string,
): "trialing" | "active" | "past_due" | "suspended" | "canceled" {
  if (eventType === "customer.subscription.deleted") return "canceled";
  switch (s) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "unpaid":
    case "incomplete_expired":
    case "paused":
      return "suspended";
    case "canceled":
      return "canceled";
    case "incomplete":
      return "trialing";
    default:
      return "active";
  }
}
