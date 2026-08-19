import { Queue, type JobsOptions } from "bullmq";
import { redis } from "./redis";

/**
 * Named BullMQ queues.
 *
 * The web service produces jobs onto these queues; the worker service
 * (deployed separately on Railway) consumes them. The two services share
 * the schema in `src/lib/queue/jobs.ts` so adding a new job is a single
 * TypeScript change.
 *
 * Sprint 2 ships two queues:
 *   - `email`         — outgoing system mail (Yandex → Resend fallback)
 *   - `webhook-stripe` — verified Stripe webhooks waiting for processing
 *
 * Both queues use Redis `bullmq:` prefix by default. Production Railway
 * sets `BULLMQ_PREFIX=staffbix-prod` to isolate from staging when both
 * environments share a Redis (they shouldn't, but the prefix guards
 * against operator mistakes).
 */

const prefix = process.env.BULLMQ_PREFIX ?? "staffbix";

const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 1_000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 1_000 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

export const emailQueue = new Queue("email", {
  connection: redis,
  prefix,
  defaultJobOptions,
});

export const stripeWebhookQueue = new Queue("webhook-stripe", {
  connection: redis,
  prefix,
  defaultJobOptions,
});

/**
 * Brand Bible ingest queue. One job per source. The job pulls bytes
 * from R2 (or reads `raw_text`), parses, chunks, embeds, and writes
 * the chunks to Postgres. Retries up to 5 times with exponential backoff
 * — the most common failure is a transient OpenAI 429 which clears in
 * < 60 seconds.
 */
export const brandBibleIngestQueue = new Queue("brand-bible-ingest", {
  connection: redis,
  prefix,
  defaultJobOptions,
});

/**
 * Approval dispatch queue — Sprint 7+.
 *
 * Approved worker_actions land here for their actual side-effect
 * (sending WhatsApp messages, customer-facing emails, social posts).
 * Web channel actions still dispatch inline from /api/approvals/[id]
 * because no slow external API is involved.
 */
export const approvalDispatchQueue = new Queue("approval-dispatch", {
  connection: redis,
  prefix,
  defaultJobOptions,
});

/**
 * Reports queue — Sprint 19.
 *
 * BullMQ repeatable jobs based on `reports.schedule` cron string.
 * `src/lib/queue/scheduler.ts` registers/refreshes the repeat plan;
 * `src/worker/index.ts` consumes the job and runs `runReport()` to
 * produce a fresh `report_runs` row.
 */
export const reportsQueue = new Queue("reports", {
  connection: redis,
  prefix,
  defaultJobOptions: {
    ...defaultJobOptions,
    // Scheduled reports overlap with manual runs — keep history short
    // because completed run state is mirrored to `report_runs` table.
    removeOnComplete: { age: 60 * 60, count: 100 },
    removeOnFail: { age: 7 * 24 * 60 * 60 },
  },
});

export const QUEUE_NAMES = [
  "email",
  "webhook-stripe",
  "brand-bible-ingest",
  "approval-dispatch",
  "reports",
] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];
