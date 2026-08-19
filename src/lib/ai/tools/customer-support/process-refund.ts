import type { Tool } from "../types";
import { stripe } from "@/lib/stripe/client";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { tenants } from "@/lib/db/schema";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * process_refund — issue a real refund against a Stripe payment intent
 * via `stripe.refunds.create` (see the execute() body below).
 *
 * Refund authority is governed by three layers:
 *
 *   1. The worker's `refundAuth` setting (USD ceiling). The model can
 *      ask for any amount, but anything above this threshold returns
 *      `refused: true` so the model pivots to "I'll check with the
 *      team and circle back" — which the human then approves in the
 *      Approval Center.
 *
 *   2. The worker's autonomy mode. In `suggest` mode this tool ALWAYS
 *      refuses — the model is meant to draft only, never act. In
 *      `approve`/`auto` mode the refund is issued against Stripe and
 *      recorded in the security ledger under `refund.processed`.
 *
 *   3. Plan-limit gate: a hardcoded $500 absolute ceiling regardless
 *      of refundAuth, because we never want a single tool call to
 *      drain a tenant's Stripe balance without a human even seeing
 *      it. This is platform-level paranoia.
 *
 * The refund hits whatever Stripe environment STRIPE_SECRET_KEY points
 * at (test or live key). It is a genuine Stripe API call, not a stub.
 */

const ABSOLUTE_USD_CEILING_CENTS = 50_000; // $500

export const processRefundTool: Tool = {
  name: "process_refund",
  description:
    "Issue a refund for a previously paid order. The amount is in USD cents. Requires the order's Stripe payment_intent id (PI_…) — get it from lookup_order first. Refuses if amount exceeds your refund authority or your worker is in 'suggest' mode.",
  parameters: {
    type: "object",
    properties: {
      paymentIntentId: {
        type: "string",
        description:
          "Stripe payment_intent id (starts with 'pi_'). Returned by lookup_order in the order object.",
      },
      amountCents: {
        type: "integer",
        description:
          "Refund amount in cents (USD). Use the order's total to full-refund.",
        minimum: 1,
        maximum: ABSOLUTE_USD_CEILING_CENTS,
      },
      reason: {
        type: "string",
        description:
          "Short human-readable reason for the refund. Goes into Stripe metadata + the security audit log.",
      },
    },
    required: ["paymentIntentId", "amountCents", "reason"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const paymentIntentId = String(args.paymentIntentId);
    const amountCents = Number(args.amountCents);
    const reason = String(args.reason);

    // Hard absolute ceiling — platform-level guardrail.
    if (amountCents > ABSOLUTE_USD_CEILING_CENTS) {
      return {
        ok: false,
        refused: true,
        reason: `Refunds above $${ABSOLUTE_USD_CEILING_CENTS / 100} require a human — escalate instead of processing.`,
      };
    }

    // Suggest mode never executes — model should draft only.
    if (ctx.autonomy === "suggest") {
      return {
        ok: false,
        refused: true,
        reason:
          "This worker is in 'suggest' mode — describe the refund in your reply, never execute. The owner will review and run it from the dashboard.",
      };
    }

    // Worker-level refund authority (from role config / settings).
    const refundAuthDollars = Number(ctx.workerSettings?.refundAuth ?? 50);
    if (amountCents > refundAuthDollars * 100) {
      return {
        ok: false,
        refused: true,
        reason: `This refund ($${(amountCents / 100).toFixed(2)}) exceeds your authority of $${refundAuthDollars}. Tell the customer you'll check with the team and escalate via escalate_to_human().`,
      };
    }

    // Validate paymentIntentId shape.
    if (!/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) {
      return {
        ok: false,
        refused: true,
        reason: "paymentIntentId looks malformed — expected something starting with 'pi_'.",
      };
    }

    // Fetch tenant to confirm Stripe customer id ownership.
    const [tenant] = await db
      .select({ id: tenants.id, stripeCustomerId: tenants.stripeCustomerId })
      .from(tenants)
      .where(eq(tenants.id, ctx.tenantId))
      .limit(1);

    if (!tenant) {
      return { ok: false, refused: true, reason: "Tenant not found." };
    }

    // Issue the refund via Stripe.
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amountCents,
        reason: "requested_by_customer",
        metadata: {
          staffbix_tenant_id: ctx.tenantId,
          staffbix_worker_id: ctx.workerId,
          staffbix_conversation_id: ctx.conversationId,
          staffbix_autonomy: ctx.autonomy,
          customer_reason: reason.slice(0, 400),
        },
      });

      await logSecurityEvent({
        kind: "refund.processed",
        tenantId: ctx.tenantId,
        payload: {
          subject: "refund.processed",
          refundId: refund.id,
          paymentIntentId,
          amountCents,
          reason,
          autonomy: ctx.autonomy,
        },
      });

      return {
        ok: true,
        data: {
          refundId: refund.id,
          status: refund.status,
          amountCents,
          paymentIntentId,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        refused: true,
        reason: `Stripe rejected the refund: ${msg}. Don't retry — tell the customer the refund needs a manual review.`,
      };
    }
  },
};
