/**
 * Job payload types — the contract between producer (web) and consumer
 * (worker). Bumping these is a coordinated deploy: ship the new payload
 * shape to the worker first, then enable producers.
 */

import type Stripe from "stripe";
import type { MailMessage } from "../mail/transport";

export interface EmailJob {
  /**
   * Caller-supplied idempotency key (e.g. `otp:${userId}:${otp.id}`).
   * The worker stores this in Redis SETNX for 24h so retries don't
   * double-send.
   */
  idemKey: string;
  /** Rendered mail message ready for the transport layer. */
  message: MailMessage;
  /** Optional Axiom trace correlation. */
  tenantId?: string;
  userId?: string;
}

/**
 * Onboarding drip jobs share the `email` queue but skip the
 * pre-rendered `message` step — the worker composes the body inline
 * because keeping five tiny HTML blobs at the call site bloats the
 * register route without buying anything. Discriminator: `kind`
 * starts with `drip_`.
 */
export interface OnboardingDripJob {
  kind: "drip_1" | "drip_2" | "drip_3" | "drip_4" | "drip_5";
  tenantId: string;
  to: string;
  userName: string;
  step: 1 | 2 | 3 | 4 | 5;
  /** Recipient locale; jobs enqueued before this field default to "en". */
  locale?: string;
}

export type EmailQueuePayload = EmailJob | OnboardingDripJob;

export function isOnboardingDripJob(
  job: EmailQueuePayload,
): job is OnboardingDripJob {
  return (
    "kind" in job &&
    typeof (job as OnboardingDripJob).kind === "string" &&
    (job as OnboardingDripJob).kind.startsWith("drip_")
  );
}

export interface StripeWebhookJob {
  /** The raw event ID from Stripe — used as idempotency key. */
  eventId: string;
  /** Full event payload. Re-verifying inside the worker is redundant
   *  because we only enqueue after signature verification, but the
   *  worker still revalidates the timestamp to drop very stale jobs. */
  event: Stripe.Event;
}

export interface BrandBibleIngestJob {
  sourceId: string;
  tenantId: string;
}

export interface ApprovalDispatchJob {
  /** worker_action id to dispatch. */
  actionId: string;
  tenantId: string;
}
