import { sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  aiUsage,
  conversations,
  messages,
  platformInvoices,
  tenants,
  workerActions,
  workers,
  ADMIN_REPORT_KINDS,
  TENANT_REPORT_KINDS,
  type ReportKind,
} from "../db/schema";

/**
 * Sprint 16 — synchronous report execution.
 *
 * `runReport()` is the single entry point used by both `/api/reports/[id]/run`
 * and `/api/admin/reports/[id]/run`. The caller (the route handler)
 * is responsible for:
 *
 *   1. Looking up the report row and verifying scope (tenant ownership
 *      OR admin-only when tenantId IS NULL).
 *   2. Inserting a `report_runs` row with status='running'.
 *   3. Awaiting `runReport()`. On success, updating the row with
 *      status='completed' + data + rowCount + durationMs + finishedAt.
 *      On thrown error, status='failed' + error.
 *
 * Splitting orchestration from data-extraction keeps the SQL pure and
 * lets a future BullMQ worker (Sprint 19) reuse this function as-is.
 */

export interface ReportRunResult {
  rowCount: number;
  data: Record<string, unknown>;
  durationMs: number;
}

export interface RunReportArgs {
  tenantId: string | null;
  kind: ReportKind;
  config?: Record<string, unknown>;
}

export async function runReport(args: RunReportArgs): Promise<ReportRunResult> {
  // Scope guard — the route layer is supposed to enforce this, but a
  // defense-in-depth check here means a bug in one of the handlers
  // can't silently cross the tenant/admin boundary.
  if (TENANT_REPORT_KINDS.has(args.kind) && !args.tenantId) {
    throw new Error(`Report kind "${args.kind}" requires a tenant scope`);
  }
  if (ADMIN_REPORT_KINDS.has(args.kind) && args.tenantId) {
    throw new Error(
      `Report kind "${args.kind}" is platform-only; tenantId must be null`,
    );
  }

  const start = Date.now();

  let data: Record<string, unknown>;
  let rowCount: number;

  switch (args.kind) {
    case "workforce_volume": {
      ({ data, rowCount } = await runWorkforceVolume(args.tenantId!));
      break;
    }
    case "ai_spend_daily": {
      ({ data, rowCount } = await runAiSpendDaily(args.tenantId!));
      break;
    }
    case "approvals_throughput": {
      ({ data, rowCount } = await runApprovalsThroughput(args.tenantId!));
      break;
    }
    case "billing_summary": {
      ({ data, rowCount } = await runBillingSummary());
      break;
    }
    case "tenants_overview": {
      ({ data, rowCount } = await runTenantsOverview());
      break;
    }
    default: {
      // exhaustiveness — TS will already complain if a new kind isn't handled
      const _exhaustive: never = args.kind;
      throw new Error(`Unknown report kind: ${String(_exhaustive)}`);
    }
  }

  return {
    data,
    rowCount,
    durationMs: Date.now() - start,
  };
}

/* ------------------------------------------------------------------- */
/* Tenant-scoped kinds                                                  */
/* ------------------------------------------------------------------- */

async function runWorkforceVolume(tenantId: string): Promise<{
  data: Record<string, unknown>;
  rowCount: number;
}> {
  // Messages-per-worker-per-day over the last 30 days. We group by the
  // UTC calendar day on `messages.created_at` and join through
  // conversations to pin the worker — `messages` has no worker_id of
  // its own. Workers with zero traffic still appear (LEFT JOIN), with
  // an empty `daily` array on the response shape.
  const rows = await db.execute<{
    worker_id: string;
    name: string;
    day: string | null;
    msg_count: string;
  }>(sql`
    SELECT
      ${workers.id} AS worker_id,
      ${workers.name} AS name,
      date_trunc('day', ${messages.createdAt})::date::text AS day,
      COUNT(${messages.id})::text AS msg_count
    FROM ${workers}
    LEFT JOIN ${conversations} ON ${conversations.workerId} = ${workers.id}
    LEFT JOIN ${messages} ON ${messages.conversationId} = ${conversations.id}
      AND ${messages.createdAt} >= NOW() - INTERVAL '30 days'
    WHERE ${workers.tenantId} = ${tenantId}
    GROUP BY ${workers.id}, ${workers.name}, day
    ORDER BY ${workers.name}, day
  `);

  // Re-shape rows into `{ workers: [{ id, name, daily: [{date,count}] }] }`.
  const byWorker = new Map<
    string,
    { id: string; name: string; daily: Array<{ date: string; count: number }> }
  >();
  for (const r of rows) {
    let bucket = byWorker.get(r.worker_id);
    if (!bucket) {
      bucket = { id: r.worker_id, name: r.name, daily: [] };
      byWorker.set(r.worker_id, bucket);
    }
    if (r.day) {
      const count = Number(r.msg_count ?? 0);
      if (count > 0) {
        bucket.daily.push({ date: r.day, count });
      }
    }
  }

  const workersOut = [...byWorker.values()];
  return {
    data: { workers: workersOut },
    rowCount: workersOut.reduce((sum, w) => sum + w.daily.length, 0),
  };
}

async function runAiSpendDaily(tenantId: string): Promise<{
  data: Record<string, unknown>;
  rowCount: number;
}> {
  // Daily AI spend over the last 30 days. cost_microcents → cents at
  // the response boundary (1 cent = 1,000,000 microcents).
  const rows = await db.execute<{
    day: string;
    microcents: string;
    call_count: string;
  }>(sql`
    SELECT
      date_trunc('day', ${aiUsage.createdAt})::date::text AS day,
      COALESCE(SUM(${aiUsage.costMicrocents}), 0)::text AS microcents,
      COUNT(*)::text AS call_count
    FROM ${aiUsage}
    WHERE ${aiUsage.tenantId} = ${tenantId}
      AND ${aiUsage.createdAt} >= NOW() - INTERVAL '30 days'
    GROUP BY day
    ORDER BY day
  `);

  const days = rows.map((r) => ({
    date: r.day,
    cents: Math.round(Number(r.microcents ?? "0") / 1_000_000),
    calls: Number(r.call_count ?? "0"),
  }));
  return {
    data: { days },
    rowCount: days.length,
  };
}

async function runApprovalsThroughput(tenantId: string): Promise<{
  data: Record<string, unknown>;
  rowCount: number;
}> {
  // worker_actions status breakdown per day, last 30d.
  const rows = await db.execute<{
    day: string;
    status: string;
    c: string;
  }>(sql`
    SELECT
      date_trunc('day', ${workerActions.createdAt})::date::text AS day,
      ${workerActions.status}::text AS status,
      COUNT(*)::text AS c
    FROM ${workerActions}
    WHERE ${workerActions.tenantId} = ${tenantId}
      AND ${workerActions.createdAt} >= NOW() - INTERVAL '30 days'
    GROUP BY day, status
    ORDER BY day
  `);

  type DayBucket = {
    date: string;
    pending: number;
    approved: number;
    sent: number;
    rejected: number;
    auto: number;
    failed: number;
  };
  const byDay = new Map<string, DayBucket>();
  for (const r of rows) {
    let bucket = byDay.get(r.day);
    if (!bucket) {
      bucket = {
        date: r.day,
        pending: 0,
        approved: 0,
        sent: 0,
        rejected: 0,
        auto: 0,
        failed: 0,
      };
      byDay.set(r.day, bucket);
    }
    const n = Number(r.c ?? "0");
    if (r.status in bucket) {
      (bucket as unknown as Record<string, number>)[r.status] = n;
    }
  }
  const days = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  return {
    data: { days },
    rowCount: days.length,
  };
}

/* ------------------------------------------------------------------- */
/* Admin / platform-scoped kinds                                        */
/* ------------------------------------------------------------------- */

async function runBillingSummary(): Promise<{
  data: Record<string, unknown>;
  rowCount: number;
}> {
  // MRR: SUM(amount_cents) of invoices with status='paid' where
  // issued_at falls inside the month bucket. 12 months back, oldest first.
  const mrrRows = await db.execute<{ month: string; mrr_cents: string }>(sql`
    SELECT
      to_char(date_trunc('month', ${platformInvoices.issuedAt}), 'YYYY-MM') AS month,
      COALESCE(SUM(${platformInvoices.amountCents}), 0)::text AS mrr_cents
    FROM ${platformInvoices}
    WHERE ${platformInvoices.status} = 'paid'
      AND ${platformInvoices.issuedAt} >= date_trunc('month', NOW() - INTERVAL '11 months')
    GROUP BY month
    ORDER BY month
  `);

  // New signups: tenants created in each month bucket, 12 months back.
  const signupRows = await db.execute<{ month: string; c: string }>(sql`
    SELECT
      to_char(date_trunc('month', ${tenants.createdAt}), 'YYYY-MM') AS month,
      COUNT(*)::text AS c
    FROM ${tenants}
    WHERE ${tenants.createdAt} >= date_trunc('month', NOW() - INTERVAL '11 months')
    GROUP BY month
    ORDER BY month
  `);

  // Churn: tenants whose current status='canceled' bucketed by the
  // month their updated_at landed in. Approximate (we don't keep a
  // status_changed_at column today), but close enough for the
  // platform overview — a dedicated tenant_status_history table is
  // a Sprint 19 item.
  const churnRows = await db.execute<{ month: string; c: string }>(sql`
    SELECT
      to_char(date_trunc('month', ${tenants.updatedAt}), 'YYYY-MM') AS month,
      COUNT(*)::text AS c
    FROM ${tenants}
    WHERE ${tenants.status} = 'canceled'
      AND ${tenants.updatedAt} >= date_trunc('month', NOW() - INTERVAL '11 months')
    GROUP BY month
    ORDER BY month
  `);

  const mrrMap = new Map(mrrRows.map((r) => [r.month, Number(r.mrr_cents ?? "0")]));
  const signupMap = new Map(signupRows.map((r) => [r.month, Number(r.c ?? "0")]));
  const churnMap = new Map(churnRows.map((r) => [r.month, Number(r.c ?? "0")]));

  // Build a contiguous 12-month axis ending at the current month so the
  // chart never has gaps even if a month had zero events.
  const months: Array<{
    month: string;
    mrrCents: number;
    newSignups: number;
    churn: number;
  }> = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    months.push({
      month: key,
      mrrCents: mrrMap.get(key) ?? 0,
      newSignups: signupMap.get(key) ?? 0,
      churn: churnMap.get(key) ?? 0,
    });
  }

  return {
    data: { months },
    rowCount: months.length,
  };
}

async function runTenantsOverview(): Promise<{
  data: Record<string, unknown>;
  rowCount: number;
}> {
  const byPlanRows = await db.execute<{ plan_id: string; c: string }>(sql`
    SELECT ${tenants.planId} AS plan_id, COUNT(*)::text AS c
    FROM ${tenants}
    GROUP BY ${tenants.planId}
    ORDER BY ${tenants.planId}
  `);
  const byStatusRows = await db.execute<{ status: string; c: string }>(sql`
    SELECT ${tenants.status}::text AS status, COUNT(*)::text AS c
    FROM ${tenants}
    GROUP BY ${tenants.status}
    ORDER BY ${tenants.status}
  `);

  const byPlan = byPlanRows.map((r) => ({
    planId: r.plan_id,
    count: Number(r.c ?? "0"),
  }));
  const byStatus = byStatusRows.map((r) => ({
    status: r.status,
    count: Number(r.c ?? "0"),
  }));

  return {
    data: { byPlan, byStatus },
    rowCount: byPlan.length + byStatus.length,
  };
}
