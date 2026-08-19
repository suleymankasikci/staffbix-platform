import type { Tool } from "../types";
import { stripe } from "@/lib/stripe/client";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * send_invoice_reminder — trigger Stripe to send (or re-send) the
 * hosted-invoice email to the customer. Stripe handles the actual
 * delivery; we just call the API.
 *
 * Refuses in 'suggest' mode: the model should describe the reminder
 * in chat instead. In 'approve' mode the call is still allowed
 * because the invoice already exists in a draft+finalized state —
 * the model approval gate is on creation, not delivery.
 */

export const sendInvoiceReminderTool: Tool = {
  name: "send_invoice_reminder",
  description:
    "Ask Stripe to email the customer the hosted invoice link (or re-email it for overdue invoices). The invoice must already exist + be in status='open'. Returns the messaging confirmation.",
  parameters: {
    type: "object",
    properties: {
      invoiceId: {
        type: "string",
        description: "The Stripe invoice id (starts with 'in_'). Comes from create_invoice or list_open_invoices.",
      },
      tone: {
        type: "string",
        description:
          "Tone label for the audit ('friendly_first_nudge', 'firm_overdue', 'final_notice'). Doesn't affect Stripe content — the hosted page is identical — but the operator-side log can filter by it.",
      },
    },
    required: ["invoiceId"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const invoiceId = String(args.invoiceId).trim();
    const tone = args.tone ? String(args.tone).trim() : null;

    if (!/^in_[A-Za-z0-9]+$/.test(invoiceId)) {
      return {
        ok: false,
        refused: true,
        reason: "invoiceId looks malformed — expected 'in_...'",
      };
    }
    if (ctx.autonomy === "suggest") {
      return {
        ok: false,
        refused: true,
        reason:
          "Worker is in 'suggest' mode — describe the reminder in your reply instead of sending. The owner clicks send in the dashboard.",
      };
    }

    try {
      const sent = await stripe.invoices.sendInvoice(invoiceId);

      await logSecurityEvent({
        kind: "invoice.reminder.sent",
        tenantId: ctx.tenantId,
        payload: {
          subject: "invoice.reminder.sent",
          stripeInvoiceId: invoiceId,
          tone,
          autonomy: ctx.autonomy,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          invoiceId: sent.id,
          status: sent.status,
          tone,
          sentNote:
            "Stripe has emailed (or re-emailed) the hosted invoice link to the customer.",
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Stripe rejected the reminder: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
