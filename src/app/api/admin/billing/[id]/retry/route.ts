import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db/client";
import { platformInvoices } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe/client";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";
import { getClientIp, getUserAgent } from "@/lib/auth/request";
import { UUID_RE } from "@/lib/admin-routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/billing/[id]/retry
 *
 * Re-attempt payment on a failed / past_due invoice via Stripe. Stripe
 * is the source of truth — we trust whatever status comes back on the
 * Invoice object and mirror it locally. A "paid" response flips our
 * status to `paid` and stamps `paidAt`.
 *
 * Stripe-side failures map to 502 (so the operator can distinguish
 * "card declined" from "our bug").
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "POST /api/admin/billing/[id]/retry",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
  }

  try {
    const [invoice] = await db
      .select({
        id: platformInvoices.id,
        tenantId: platformInvoices.tenantId,
        stripeInvoiceId: platformInvoices.stripeInvoiceId,
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

    let paid: Stripe.Invoice;
    try {
      paid = await stripe.invoices.pay(invoice.stripeInvoiceId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stripe error";
      return NextResponse.json(
        { error: `Stripe retry failed: ${msg}` },
        { status: 502 },
      );
    }

    const succeeded = paid.status === "paid";
    if (succeeded) {
      await db
        .update(platformInvoices)
        .set({
          status: "paid",
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(platformInvoices.id, id));
    }

    await logSecurityEvent({
      kind: "billing.invoice.retry",
      tenantId: invoice.tenantId,
      userId: session.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        subject: "billing.retry",
        invoiceId: invoice.id,
        stripeInvoiceId: invoice.stripeInvoiceId,
        previousStatus: invoice.status,
        stripeStatus: paid.status,
        succeeded,
      },
    });

    return NextResponse.json({
      ok: succeeded,
      stripeStatus: paid.status,
    });
  } catch (err) {
    console.error("[admin.billing.retry] failed", err);
    return NextResponse.json(
      { error: "Could not retry invoice." },
      { status: 500 },
    );
  }
}
