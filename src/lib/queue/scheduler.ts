import { eq, isNotNull, and } from "drizzle-orm";
import { db } from "../db/client";
import { reports } from "../db/schema";
import { reportsQueue } from "./queues";

/**
 * Reports scheduler — Sprint 19.
 *
 * Reads every `reports` row whose `schedule` column is not null and
 * registers a BullMQ repeatable job that fires according to the cron
 * expression. The worker (src/worker/index.ts) consumes the job and
 * runs `runReport()` to produce a fresh `report_runs` row.
 *
 * Cron expressions follow the standard 5-field syntax that BullMQ's
 * `cron-parser` accepts (e.g. `"0 0 * * 1"` = every Monday 00:00 UTC).
 *
 * Repeatable jobs are identified by `{ jobId: "report:<reportId>" }`
 * — re-running `registerScheduledReports()` is idempotent: BullMQ
 * upserts the repeat plan when the cron string changed and is a no-op
 * when it didn't.
 *
 * Call this:
 *   - At worker boot (src/worker/index.ts on startup)
 *   - After any POST /api/reports or PATCH /api/reports/[id] that
 *     mutates the schedule field
 */

const JOB_NAME = "scheduled-report-run";

export interface ScheduledReportJobData {
  reportId: string;
  tenantId: string | null;
  kind: string;
}

/** Build the BullMQ repeat job id deterministically per report row. */
function repeatJobId(reportId: string): string {
  return `report-${reportId}`;
}

/**
 * Register a single scheduled report. Idempotent on jobId — re-running
 * with the same cron is a no-op; with a different cron BullMQ updates
 * the existing plan.
 */
export async function registerScheduledReport(args: {
  reportId: string;
  tenantId: string | null;
  kind: string;
  cron: string;
}): Promise<void> {
  const jobId = repeatJobId(args.reportId);
  // First, remove any existing repeat plan for this jobId — BullMQ
  // doesn't deduplicate cron strings, so we wipe-and-replace.
  await reportsQueue.removeJobScheduler(jobId).catch(() => {
    // ignore: scheduler may not exist yet
  });

  await reportsQueue.upsertJobScheduler(
    jobId,
    { pattern: args.cron, tz: "UTC" },
    {
      name: JOB_NAME,
      data: {
        reportId: args.reportId,
        tenantId: args.tenantId,
        kind: args.kind,
      } satisfies ScheduledReportJobData,
    },
  );
}

/** Remove the repeat plan for a single report (called on DELETE). */
export async function unregisterScheduledReport(reportId: string): Promise<void> {
  await reportsQueue.removeJobScheduler(repeatJobId(reportId)).catch(() => {
    // no-op if the scheduler never existed
  });
}

/**
 * Bulk-register every `reports` row whose schedule is non-null.
 * Worker boot calls this so a fresh Railway deploy doesn't lose
 * registered schedules.
 *
 * Returns the number of jobs registered.
 */
export async function registerAllScheduledReports(): Promise<{
  registered: number;
}> {
  const rows = await db
    .select({
      id: reports.id,
      tenantId: reports.tenantId,
      kind: reports.kind,
      schedule: reports.schedule,
    })
    .from(reports)
    .where(and(isNotNull(reports.schedule)));

  let registered = 0;
  for (const r of rows) {
    if (!r.schedule) continue;
    try {
      await registerScheduledReport({
        reportId: r.id,
        tenantId: r.tenantId,
        kind: r.kind,
        cron: r.schedule,
      });
      registered++;
    } catch (err) {
      // A bad cron string shouldn't break boot — log and skip.
      console.warn(
        `[scheduler] failed to register report ${r.id}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
  return { registered };
}

/**
 * Convenience used by /api/reports POST + PATCH route handlers. Pass
 * the full row that was just inserted/updated; we read `schedule` from
 * it and either register or unregister accordingly.
 */
export async function syncReportSchedule(row: {
  id: string;
  tenantId: string | null;
  kind: string;
  schedule: string | null;
}): Promise<void> {
  if (row.schedule && row.schedule.trim().length > 0) {
    await registerScheduledReport({
      reportId: row.id,
      tenantId: row.tenantId,
      kind: row.kind,
      cron: row.schedule.trim(),
    });
  } else {
    await unregisterScheduledReport(row.id);
  }
}

void eq; // kept for future per-tenant filtered queries
