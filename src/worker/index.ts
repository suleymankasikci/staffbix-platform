import "dotenv/config";
import { Worker, type Job } from "bullmq";
import { createBullConnection } from "@/lib/queue/redis";
import {
  isOnboardingDripJob,
  type EmailJob,
  type EmailQueuePayload,
  type OnboardingDripJob,
  type StripeWebhookJob,
  type BrandBibleIngestJob,
  type ApprovalDispatchJob,
} from "@/lib/queue/jobs";
import { sendSystemMail, type MailMessage } from "@/lib/mail/transport";
import { renderBrandedEmail, renderText, type EmailBlock } from "@/lib/mail/layout";
import { getMailCopy, fill } from "@/lib/mail/copy";
import { normalizeLocale } from "@/lib/i18n/config";
import { redis } from "@/lib/queue/redis";
import { ingestBrandBibleSource } from "@/lib/brand-bible/ingest";
import { dispatchAction } from "@/lib/approvals/runtime";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { reports, reportRuns, type ReportKind } from "@/lib/db/schema";
import { runReport } from "@/lib/reports/runner";
import { logSecurityEvent } from "@/lib/audit/log";
import type { ScheduledReportJobData } from "@/lib/queue/scheduler";

/**
 * Worker entrypoint. Deployed as a separate Railway service that runs
 * `tsx src/worker/index.ts`. Does not bind a port — pure consumer.
 *
 * Two queues:
 *   - `email`         — outgoing system mail
 *   - `webhook-stripe` — Stripe events that need slow processing
 *
 * Each worker uses its own ioredis connection (BullMQ requirement) but
 * shares the rate-limit / app-cache redis client for everything else.
 */

const prefix = process.env.BULLMQ_PREFIX ?? "staffbix";

/* ─── email queue ─────────────────────────────────────────────────────────── */

/**
 * Compose an onboarding drip email — branded + localized via the shared
 * mail layout/copy (src/lib/mail). Copy is rendered in the recipient's
 * locale (job.locale, default "en"); brand terms preserved by the
 * translator.
 */
function renderDripMessage(job: OnboardingDripJob): MailMessage {
  const appBase =
    process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "https://staffbix.com";
  const locale = normalizeLocale(job.locale ?? "en") ?? "en";
  const c = getMailCopy(locale).drip;
  const greeting = job.userName
    ? fill(c.greetingNamed, { name: job.userName })
    : c.greetingPlain;

  const build = (
    kind: OnboardingDripJob["kind"],
  ): { subject: string; heading: string; preheader: string; blocks: EmailBlock[]; cta?: { label: string; url: string }; replyTo?: string } => {
    switch (kind) {
      case "drip_1":
        return {
          subject: c.d1.subject,
          heading: c.d1.heading,
          preheader: c.d1.preheader,
          cta: { label: c.ctaDashboard, url: `${appBase}/app/dashboard` },
          blocks: [{ p: greeting }, { p: c.d1.p1 }, { p: c.d1.p2 }, { note: c.d1.unsub }],
        };
      case "drip_2":
        return {
          subject: c.d2.subject,
          heading: c.d2.heading,
          preheader: c.d2.preheader,
          cta: { label: c.ctaQuickstart, url: `${appBase}/docs/quickstart` },
          blocks: [{ p: greeting }, { p: c.d2.intro }, { list: { ordered: true, items: c.d2.steps } }, { note: c.d2.walkthrough }],
        };
      case "drip_3":
        return {
          subject: c.d3.subject,
          heading: c.d3.heading,
          preheader: c.d3.preheader,
          cta: { label: c.ctaHire, url: `${appBase}/app/workforce/hire` },
          blocks: [{ p: greeting }, { p: c.d3.p1 }, { p: c.d3.p2 }, { note: c.d3.reply }],
        };
      case "drip_4":
        return {
          subject: c.d4.subject,
          heading: c.d4.heading,
          preheader: c.d4.preheader,
          cta: { label: c.ctaAddSource, url: `${appBase}/app/brand-bible` },
          blocks: [{ p: greeting }, { p: c.d4.p1 }, { p: c.d4.intro }, { list: { ordered: false, items: c.d4.items } }, { note: c.d4.more }],
        };
      case "drip_5":
        return {
          subject: c.d5.subject,
          heading: c.d5.heading,
          preheader: c.d5.preheader,
          replyTo: "feedback@staffbix.com",
          blocks: [{ p: greeting }, { p: c.d5.p1 }, { p: c.d5.intro }, { list: { ordered: false, items: c.d5.items } }, { p: c.d5.thanks }],
        };
    }
  };

  const d = build(job.kind);
  return {
    to: job.to,
    subject: d.subject,
    html: renderBrandedEmail({ locale, preheader: d.preheader, heading: d.heading, blocks: d.blocks, cta: d.cta }),
    text: renderText({ heading: d.heading, blocks: d.blocks, cta: d.cta }),
    ...(d.replyTo ? { replyTo: d.replyTo } : {}),
  };
}

const emailWorker = new Worker<EmailQueuePayload>(
  "email",
  async (job: Job<EmailQueuePayload>) => {
    if (isOnboardingDripJob(job.data)) {
      const drip = job.data;
      const idemKey = `mail-sent:tenant:${drip.tenantId}:drip:${drip.step}`;
      const claimed = await redis.set(
        idemKey,
        job.id ?? "1",
        "EX",
        14 * 86400,
        "NX",
      );
      if (claimed !== "OK") {
        console.log(`[worker:email] drip dedup hit ${idemKey}, skipping`);
        return { dedup: true };
      }
      try {
        const message = renderDripMessage(drip);
        const result = await sendSystemMail(message);
        console.log(
          `[worker:email] sent drip_${drip.step} via ${result.provider} to=${drip.to} tenant=${drip.tenantId}`,
        );
        return result;
      } catch (err) {
        await redis.del(idemKey);
        throw err;
      }
    }

    const data: EmailJob = job.data;
    const idemKey = `mail-sent:${data.idemKey}`;
    // Idempotency: set-if-not-exists. If already set, this is a retry of
    // an already-delivered job — bail out.
    const claimed = await redis.set(idemKey, job.id ?? "1", "EX", 86400, "NX");
    if (claimed !== "OK") {
      console.log(`[worker:email] dedup hit ${idemKey}, skipping`);
      return { dedup: true };
    }
    try {
      const result = await sendSystemMail(data.message);
      console.log(
        `[worker:email] sent via ${result.provider} to=${data.message.to} subject="${data.message.subject}"`,
      );
      return result;
    } catch (err) {
      // Release the idempotency key on failure so the retry can attempt
      // delivery again — better to risk a double-send than a silent loss.
      await redis.del(idemKey);
      throw err;
    }
  },
  {
    connection: createBullConnection(),
    prefix,
    concurrency: 8,
    autorun: true,
  },
);

emailWorker.on("failed", (job, err) => {
  console.error(`[worker:email] job ${job?.id} failed:`, err.message);
});
emailWorker.on("completed", (job) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[worker:email] job ${job.id} ok`);
  }
});

/* ─── webhook-stripe queue ────────────────────────────────────────────────── */

const stripeWorker = new Worker<StripeWebhookJob>(
  "webhook-stripe",
  async (job: Job<StripeWebhookJob>) => {
    // Stripe event ID is the natural dedup key.
    const idemKey = `stripe-event:${job.data.eventId}`;
    const claimed = await redis.set(idemKey, "1", "EX", 86400, "NX");
    if (claimed !== "OK") {
      console.log(`[worker:stripe] dedup hit for event ${job.data.eventId}`);
      return { dedup: true };
    }
    // Sprint 2 cold-path is mostly a structured log + an audit row. The
    // hot path in the web route already updated tenant.status. Sprint 11
    // expands this to: invoice received → R2 archive + email receipt;
    // payment failed → notification email; refunded → admin alert.
    console.log(
      `[worker:stripe] processed event type=${job.data.event.type} id=${job.data.eventId}`,
    );
    return { processed: true };
  },
  {
    connection: createBullConnection(),
    prefix,
    concurrency: 4,
    autorun: true,
  },
);

stripeWorker.on("failed", (job, err) => {
  console.error(`[worker:stripe] job ${job?.id} failed:`, err.message);
});
stripeWorker.on("completed", (job) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[worker:stripe] job ${job.id} ok`);
  }
});

/* ─── brand-bible-ingest queue ───────────────────────────────────────────── */

const brandBibleWorker = new Worker<BrandBibleIngestJob>(
  "brand-bible-ingest",
  async (job: Job<BrandBibleIngestJob>) => {
    const { sourceId, tenantId } = job.data;
    const result = await ingestBrandBibleSource({ sourceId, tenantId });
    console.log(
      `[worker:brand-bible] ingested source=${sourceId} chunks=${result.chunkCount} tokens=${result.tokens}`,
    );
    return result;
  },
  {
    connection: createBullConnection(),
    prefix,
    // Embeddings are bound by OpenAI rate limits, not our CPU. Two
    // concurrent ingests fit comfortably under tier-1 (5000 RPM / 1M TPM).
    concurrency: 2,
    autorun: true,
  },
);

brandBibleWorker.on("failed", (job, err) => {
  console.error(
    `[worker:brand-bible] job ${job?.id} (source=${job?.data?.sourceId}) failed:`,
    err.message,
  );
});
brandBibleWorker.on("completed", (job) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[worker:brand-bible] job ${job.id} ok`);
  }
});

/* ─── approval-dispatch queue ────────────────────────────────────────────── */

const approvalWorker = new Worker<ApprovalDispatchJob>(
  "approval-dispatch",
  async (job: Job<ApprovalDispatchJob>) => {
    const { actionId, tenantId } = job.data;
    const row = await dispatchAction(actionId);
    if (!row) {
      console.warn(`[worker:approval-dispatch] action ${actionId} not found`);
      return { dropped: true };
    }
    console.log(
      `[worker:approval-dispatch] tenant=${tenantId} action=${actionId} kind=${row.kind} → status=${row.status}`,
    );
    return { actionId, status: row.status };
  },
  {
    connection: createBullConnection(),
    prefix,
    // External APIs (Meta WhatsApp, customer SMTP) are the bottleneck.
    // 4 in parallel matches the throughput we'd see from a single Meta
    // phone number under normal load.
    concurrency: 4,
    autorun: true,
  },
);

approvalWorker.on("failed", (job, err) => {
  console.error(
    `[worker:approval-dispatch] job ${job?.id} (action=${job?.data?.actionId}) failed:`,
    err.message,
  );
});
approvalWorker.on("completed", (job) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[worker:approval-dispatch] job ${job.id} ok`);
  }
});

/* ─── reports queue ──────────────────────────────────────────────────────── */
//
// Consumes the repeatable jobs registered by `scheduler.ts` (one repeat
// plan per scheduled report). Without this consumer the cron jobs piled
// up unprocessed — scheduled reports never ran. Mirrors the manual-run
// route's persistence: insert a `running` report_runs row, execute
// runReport(), then mark completed/failed.
const reportsWorker = new Worker<ScheduledReportJobData>(
  "reports",
  async (job: Job<ScheduledReportJobData>) => {
    const { reportId } = job.data;
    // Re-read the report so we use its CURRENT kind/tenant/config (the
    // repeat job's payload can be stale if the report was edited).
    const [report] = await db
      .select({
        id: reports.id,
        tenantId: reports.tenantId,
        kind: reports.kind,
        config: reports.config,
      })
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);
    if (!report) {
      console.warn(`[worker:reports] report ${reportId} gone — skipping`);
      return { dropped: true };
    }

    const [runRow] = await db
      .insert(reportRuns)
      .values({ reportId: report.id, status: "running" })
      .returning({ id: reportRuns.id });

    try {
      const result = await runReport({
        tenantId: report.tenantId,
        kind: report.kind as ReportKind,
        config: (report.config as Record<string, unknown>) ?? {},
      });
      await db
        .update(reportRuns)
        .set({
          status: "completed",
          finishedAt: new Date(),
          durationMs: result.durationMs,
          rowCount: result.rowCount,
          data: result.data,
          error: null,
        })
        .where(eq(reportRuns.id, runRow!.id));
      await logSecurityEvent({
        kind: "report.run.completed",
        tenantId: report.tenantId,
        payload: {
          subject: "report.run.completed",
          reportId: report.id,
          runId: runRow!.id,
          kind: report.kind,
          durationMs: result.durationMs,
          rowCount: result.rowCount,
          scope: "scheduled",
        },
      });
      return { runId: runRow!.id, rowCount: result.rowCount };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db
        .update(reportRuns)
        .set({ status: "failed", finishedAt: new Date(), error: message.slice(0, 500) })
        .where(eq(reportRuns.id, runRow!.id));
      await logSecurityEvent({
        kind: "report.run.failed",
        tenantId: report.tenantId,
        payload: {
          subject: "report.run.failed",
          reportId: report.id,
          runId: runRow!.id,
          kind: report.kind,
          error: message.slice(0, 200),
          scope: "scheduled",
        },
      });
      throw err;
    }
  },
  { connection: createBullConnection(), prefix, concurrency: 2, autorun: true },
);

reportsWorker.on("failed", (job, err) => {
  console.error(`[worker:reports] job ${job?.id} (report=${job?.data?.reportId}) failed:`, err.message);
});
reportsWorker.on("completed", (job) => {
  console.log(`[worker:reports] job ${job.id} (report=${job.data?.reportId}) ok`);
});

/* ─── lifecycle ───────────────────────────────────────────────────────────── */

const readyAt = new Date().toISOString();
console.log(
  `[worker] up at ${readyAt} (queues: email, webhook-stripe, brand-bible-ingest, approval-dispatch, reports)`,
);

async function shutdown(reason: string) {
  console.log(`[worker] shutting down (${reason})...`);
  await Promise.allSettled([
    emailWorker.close(),
    stripeWorker.close(),
    brandBibleWorker.close(),
    approvalWorker.close(),
    reportsWorker.close(),
  ]);
  await redis.quit();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
