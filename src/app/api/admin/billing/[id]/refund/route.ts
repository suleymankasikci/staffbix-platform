import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db/client";
import { platformInvoices } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe/client";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";
import { getClientIp, getUserAgent, readJson } from "@/lib/auth/request";
import { UUID_RE } from "@/lib/admin-routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/billing/[id]/refund
 *
 * Issue a refund against the Stripe `payment_intent` linked to the
 * invoice. Body shape:
 *   { amount?: number } // cents; omit / null for full refund
 *
 * The Stripe call is wrapped — any Stripe failure surfaces as a 502
 * with the message Stripe returned, so the operator knows whether to
 * retry or hand it off. On success we flip the mirror row to
 * `refunded`.
 *
 * Audit kind is `billing.refund.completed` on success (Sprint 17
 * enum, drizzle/0013_sprint17.sql). A separate `billing.refund.failed`
 * kind exists for the failure branch when we wire that path.
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "POST /api/admin/billing/[id]/refund",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
  }

  const body = await readJson<{ amount?: number | null }>(req);
  const amountCents =
    body && typeof body.amount === "number" && Number.isFinite(body.amount)
      ? Math.floor(body.amount)
      : null;
  if (amountCents !== null && amountCents <= 0) {
    return NextResponse.json(
      { error: "amount must be > 0 cents" },
      { status: 400 },
    );
  }

  try {
    const [invoice] = await db
      .select({
        id: platformInvoices.id,
        tenantId: platformInvoices.tenantId,
        stripeInvoiceId: platformInvoices.stripeInvoiceId,
        amountCents: platformInvoices.amountCents,
        status: platformInvoices.status,
      })
      .from(platformInvoices)
      .where(eq(platformInvoices.id, id))
      .limit(1);

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 },
      );
    }

    // We need the payment_intent on the Stripe invoice to issue a
    // refund. Pull it fresh from Stripe rather than trusting a stale
    // mirror — the call here is cheap and authoritative.
    //
    // Stripe API ≥ 2025-x dropped the top-level `payment_intent` field
    // on Invoice in favour of an `InvoicePayments` collection. We pull
    // the first paid payment record and read the PaymentIntent off it.
    let stripeInvoice: Stripe.Invoice;
    try {
      stripeInvoice = await stripe.invoices.retrieve(invoice.stripeInvoiceId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stripe error";
      return NextResponse.json(
        { error: `Stripe: ${msg}` },
        { status: 502 },
      );
    }

    let pi: string | null = null;
    const payments = stripeInvoice.payments?.data ?? [];
    for (const p of payments) {
      const ref = p.payment?.payment_intent;
      const piId = typeof ref === "string" ? ref : ref?.id ?? null;
      if (piId) {
        pi = piId;
        if (p.status === "paid") break;
      }
    }
    if (!pi) {
      return NextResponse.json(
        { error: "Invoice has no payment_intent to refund" },
        { status: 400 },
      );
    }

    let refund: Stripe.Refund;
    try {
      refund = await stripe.refunds.create({
        payment_intent: pi,
        ...(amountCents !== null ? { amount: amountCents } : {}),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stripe error";
      return NextResponse.json(
        { error: `Stripe refund failed: ${msg}` },
        { status: 502 },
      );
    }

    await db
      .update(platformInvoices)
      .set({ status: "refunded", updatedAt: new Date() })
      .where(eq(platformInvoices.id, id));

    await logSecurityEvent({
      kind: "billing.refund.completed",
      tenantId: invoice.tenantId,
      userId: session.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        subject: "billing.refund",
        invoiceId: invoice.id,
        stripeInvoiceId: invoice.stripeInvoiceId,
        refundId: refund.id,
        amountCents: refund.amount,
        currency: refund.currency,
        partial: amountCents !== null && amountCents < invoice.amountCents,
      },
    });

    return NextResponse.json({ ok: true, refundId: refund.id });
  } catch (err) {
    console.error("[admin.billing.refund] failed", err);
    return NextResponse.json(
      { error: "Could not refund invoice." },
      { status: 500 },
    );
  }
}
