import type { Tool } from "../types";
import { stripe } from "@/lib/stripe/client";

/**
 * list_open_invoices — fetch open (unpaid) invoices for a customer
 * email from Stripe. Used by Invoice Specialist to triage who needs a
 * reminder, who's overdue, and what the operator's outstanding A/R
 * looks like.
 */

export const listOpenInvoicesTool: Tool = {
  name: "list_open_invoices",
  description:
    "List a customer's open (unpaid) Stripe invoices. Returns id, amount, due date, status, and the hosted URL for each. Use BEFORE sending a reminder so you reference the right invoice.",
  parameters: {
    type: "object",
    properties: {
      customerEmail: {
        type: "string",
        description: "Customer email to look up.",
      },
      includeOverdueOnly: {
        type: "boolean",
        description: "If true, return only invoices past their due date.",
      },
    },
    required: ["customerEmail"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const customerEmail = String(args.customerEmail).trim().toLowerCase();
    const includeOverdueOnly = Boolean(args.includeOverdueOnly);

    if (!customerEmail.includes("@")) {
      return { ok: false, refused: true, reason: "customerEmail malformed." };
    }

    try {
      const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
      const cust = customers.data[0];
      if (!cust) {
        return {
          ok: true,
          data: {
            customerEmail,
            invoices: [],
            count: 0,
            reason: "No Stripe customer with that email.",
          },
        };
      }

      const list = await stripe.invoices.list({
        customer: cust.id,
        status: "open",
        limit: 50,
      });

      const nowSec = Math.floor(Date.now() / 1000);
      let invoices = list.data.map((inv) => ({
        id: inv.id,
        amountDueCents: inv.amount_due,
        amountPaidCents: inv.amount_paid,
        currency: inv.currency,
        status: inv.status,
        dueDate: inv.due_date,
        dueDateIso: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
        hostedInvoiceUrl: inv.hosted_invoice_url,
        pdfUrl: inv.invoice_pdf,
        overdue: typeof inv.due_date === "number" && inv.due_date < nowSec,
      }));

      if (includeOverdueOnly) {
        invoices = invoices.filter((i) => i.overdue);
      }

      const totalOutstandingCents = invoices.reduce(
        (sum, i) => sum + (i.amountDueCents ?? 0),
        0,
      );

      return {
        ok: true,
        data: {
          customerEmail,
          customerId: cust.id,
          count: invoices.length,
          totalOutstandingCents,
          invoices,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Stripe invoice list failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    } finally {
      void ctx;
    }
  },
};
