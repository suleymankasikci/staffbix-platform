import type { Tool } from "../types";
import { stripe } from "@/lib/stripe/client";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * create_invoice — issue a real Stripe Invoice for a customer. Uses the
 * tenant's Stripe account (the same one billing the tenant their own
 * subscription); the customer gets a hosted invoice URL + PDF via
 * Stripe-native delivery.
 *
 * Flow (Stripe API):
 *   1. Find-or-create customer by email
 *   2. Create invoice item (the line item) on the customer
 *   3. Create the draft invoice (collection_method=send_invoice)
 *   4. Finalize so the hosted URL + PDF exist
 *
 * Doesn't send automatically — that's a separate `send_invoice_reminder`
 * tool so the operator stays in the loop on outbound mail volume.
 *
 * Authority guardrail: amountCents capped at $50,000 per invoice (5M
 * cents). Large invoices feel like the kind of thing that wants a
 * human signing off; over-cap calls return refused so the model
 * escalates instead.
 */

const MAX_INVOICE_CENTS = 5_000_000;

export const createInvoiceTool: Tool = {
  name: "create_invoice",
  description:
    "Create a real Stripe Invoice (test mode). Amount is in cents (USD by default). Returns the hosted invoice URL + PDF. The customer is NOT auto-emailed — call send_invoice_reminder once the operator confirms.",
  parameters: {
    type: "object",
    properties: {
      customerEmail: {
        type: "string",
        description: "Email the invoice is for. Becomes the Stripe customer's email.",
      },
      customerName: {
        type: "string",
        description: "Customer's name as it should appear on the invoice.",
      },
      amountCents: {
        type: "integer",
        description: "Total invoice amount in cents (USD).",
        minimum: 100,
        maximum: MAX_INVOICE_CENTS,
      },
      description: {
        type: "string",
        description: "1-line description of what this invoice covers.",
      },
      daysUntilDue: {
        type: "integer",
        description: "Days from now until the invoice is due. Stripe net-N pattern.",
        minimum: 1,
        maximum: 90,
      },
      currency: {
        type: "string",
        description: "ISO 4217 currency code. Defaults to USD. Lowercase.",
      },
    },
    required: ["customerEmail", "customerName", "amountCents", "description", "daysUntilDue"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const customerEmail = String(args.customerEmail).trim().toLowerCase();
    const customerName = String(args.customerName).trim();
    const amountCents = Number(args.amountCents);
    const description = String(args.description).trim();
    const daysUntilDue = Number(args.daysUntilDue);
    const currency = args.currency ? String(args.currency).toLowerCase() : "usd";

    if (!customerEmail.includes("@")) {
      return { ok: false, refused: true, reason: "customerEmail malformed." };
    }
    if (!Number.isFinite(amountCents) || amountCents < 100) {
      return { ok: false, refused: true, reason: "amountCents must be ≥ 100 (1.00)." };
    }
    if (amountCents > MAX_INVOICE_CENTS) {
      return {
        ok: false,
        refused: true,
        reason: `Invoices above $${MAX_INVOICE_CENTS / 100} need a human — escalate instead.`,
      };
    }
    if (description.length < 5) {
      return { ok: false, refused: true, reason: "description too short." };
    }
    if (!/^[a-z]{3}$/.test(currency)) {
      return { ok: false, refused: true, reason: "currency must be a 3-letter ISO code." };
    }

    try {
      // Find or create the Stripe customer for this email
      const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
      let customerId: string;
      if (existing.data[0]) {
        customerId = existing.data[0].id;
      } else {
        const created = await stripe.customers.create({
          email: customerEmail,
          name: customerName,
          metadata: {
            staffbix_tenant_id: ctx.tenantId,
            staffbix_worker_id: ctx.workerId,
            staffbix_created_via: "invoice_specialist",
          },
        });
        customerId = created.id;
      }

      // Create invoice item
      await stripe.invoiceItems.create({
        customer: customerId,
        amount: amountCents,
        currency,
        description,
        metadata: {
          staffbix_tenant_id: ctx.tenantId,
          staffbix_worker_id: ctx.workerId,
        },
      });

      // Create the invoice (send_invoice = hosted invoice + PDF, no auto charge)
      const invoice = await stripe.invoices.create({
        customer: customerId,
        collection_method: "send_invoice",
        days_until_due: daysUntilDue,
        metadata: {
          staffbix_tenant_id: ctx.tenantId,
          staffbix_worker_id: ctx.workerId,
          staffbix_conversation_id: ctx.conversationId,
        },
      });

      // Finalize so URL + PDF are available
      const finalized = await stripe.invoices.finalizeInvoice(invoice.id ?? "");

      await logSecurityEvent({
        kind: "invoice.created",
        tenantId: ctx.tenantId,
        payload: {
          subject: "invoice.created",
          stripeInvoiceId: finalized.id,
          stripeCustomerId: customerId,
          amountCents,
          currency,
          customerEmail,
          daysUntilDue,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          invoiceId: finalized.id,
          customerId,
          customerEmail,
          amountCents,
          currency,
          status: finalized.status,
          hostedInvoiceUrl: finalized.hosted_invoice_url,
          pdfUrl: finalized.invoice_pdf,
          dueDate: finalized.due_date
            ? new Date(finalized.due_date * 1000).toISOString()
            : null,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        refused: true,
        reason: `Stripe rejected the invoice: ${msg}`,
      };
    }
  },
};
