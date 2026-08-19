import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  tenants,
  plans,
  workers,
  tenantAiSpend,
  aiUsage,
  users,
  invitations,
} from "../db/schema";

/**
 * Plan-limit enforcement.
 *
 * Called at the point where a tenant might cross a cap:
 *   - hireWorker → check workers count vs maxWorkers
 *   - chatReply / embeddings hot path → check current-month AI spend vs maxMonthlyAiDollars
 *   - integrations → channels per worker (Sprint 12)
 *
 * The result `{ ok: true }` lets the call proceed. `{ ok: false, reason }`
 * means the limit is exceeded — the caller should respond with HTTP 402
 * or surface the in-app paywall.
 *
 * `-1` on a plan limit means "unlimited" (Scale + Enterprise tiers).
 */

export type LimitResult =
  | { ok: true }
  | { ok: false; reason: string; limit: number; current: number };

/** Returns the tenant's plan + an active hardness flag. */
async function loadPlanForTenant(tenantId: string) {
  const [row] = await db
    .select({
      planId: tenants.planId,
      status: tenants.status,
      plan: plans,
    })
    .from(tenants)
    .innerJoin(plans, eq(plans.id, tenants.planId))
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return row;
}

/**
 * Workers cap. Counts non-terminated workers vs plan.maxWorkers.
 *
 * Trialing tenants are subject to the same caps as their plan — the
 * trial doesn't unlock more worker slots than the paid version.
 */
export async function checkWorkersCap(args: {
  tenantId: string;
}): Promise<LimitResult> {
  const planRow = await loadPlanForTenant(args.tenantId);
  if (!planRow) return { ok: false, reason: "tenant_not_found", limit: 0, current: 0 };
  const max = planRow.plan.maxWorkers;
  if (max === -1) return { ok: true };

  const countRows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(workers)
    .where(
      and(
        eq(workers.tenantId, args.tenantId),
        sql`${workers.status} <> 'terminated'`,
      ),
    );
  const current = Number(countRows[0]?.c ?? 0);
  if (current >= max) {
    return {
      ok: false,
      reason: `Worker cap reached (${current}/${max}). Upgrade your plan to hire more.`,
      limit: max,
      current,
    };
  }
  return { ok: true };
}

/**
 * Monthly AI dollars cap. Reads from `tenant_ai_spend` (rollup table)
 * for past days and falls back to live `ai_usage` for today (the
 * rollup runs nightly so today's spend isn't in tenant_ai_spend yet).
 *
 * Plan limit is in WHOLE DOLLARS (plan.maxMonthlyAiDollars); the
 * ledger stores microcents. Conversion: 1 dollar = 100 cents = 1e8
 * microcents.
 */
export async function checkAiSpendCap(args: {
  tenantId: string;
  /** Cost (microcents) of the call we're about to make, to pre-add to
   *  the current spend total. Optional — checkAiSpendCap can also be
   *  called before incurring any cost (e.g. when the user opens the
   *  worker UI to decide whether to surface the paywall). */
  pendingMicrocents?: number;
}): Promise<LimitResult & { spentDollars?: number }> {
  const planRow = await loadPlanForTenant(args.tenantId);
  if (!planRow) return { ok: false, reason: "tenant_not_found", limit: 0, current: 0 };
  const maxDollars = planRow.plan.maxMonthlyAiDollars;
  if (maxDollars === -1) return { ok: true };

  // First day of the current UTC month, ISO date string.
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthStartIso = monthStart.toISOString().slice(0, 10); // YYYY-MM-DD

  // Rollup totals through yesterday
  const rollupRows = await db
    .select({
      total: sql<string>`COALESCE(SUM(${tenantAiSpend.costMicrocents}), 0)::text`,
    })
    .from(tenantAiSpend)
    .where(
      and(
        eq(tenantAiSpend.tenantId, args.tenantId),
        gte(tenantAiSpend.day, monthStartIso),
      ),
    );
  const rolledUpMicrocents = Number(rollupRows[0]?.total ?? "0");

  // Live total from ai_usage for today's date range. The rollup might
  // include today already if it ran intraday; this sum covers from the
  // start of the month forward as a defensive belt-and-suspenders. We
  // then take MAX of the two so we don't over-count when both have the
  // same day.
  const liveRows = await db
    .select({
      total: sql<string>`COALESCE(SUM(${aiUsage.costMicrocents}), 0)::text`,
    })
    .from(aiUsage)
    .where(
      and(
        eq(aiUsage.tenantId, args.tenantId),
        gte(aiUsage.createdAt, monthStart),
      ),
    );
  const liveMicrocents = Number(liveRows[0]?.total ?? "0");

  // Prefer the live number when it's higher (rollup hasn't caught up).
  const spentMicrocents = Math.max(rolledUpMicrocents, liveMicrocents);
  const projected = spentMicrocents + (args.pendingMicrocents ?? 0);
  const projectedDollars = projected / 100_000_000;

  if (projectedDollars > maxDollars) {
    return {
      ok: false,
      reason: `Monthly AI cap reached ($${projectedDollars.toFixed(2)} / $${maxDollars}). Upgrade your plan or wait for next month.`,
      limit: maxDollars,
      current: Math.round(projectedDollars * 100) / 100,
      spentDollars: spentMicrocents / 100_000_000,
    };
  }
  return { ok: true, spentDollars: spentMicrocents / 100_000_000 };
}

/**
 * Team seats cap. Counts active users + pending invitations against
 * plan.maxTeamSeats. The Owner row counts as one seat.
 *
 * `pendingInvitations` are included so the user can't dodge the cap by
 * sending all their invites in one burst before any are accepted.
 * Revoked / expired invitations are excluded.
 */
export async function checkTeamSeatsCap(args: {
  tenantId: string;
  /** Add N to the projected count — pass 1 before issuing a new invite. */
  pending?: number;
}): Promise<LimitResult> {
  const planRow = await loadPlanForTenant(args.tenantId);
  if (!planRow) return { ok: false, reason: "tenant_not_found", limit: 0, current: 0 };
  const max = planRow.plan.maxTeamSeats;
  if (max === -1) return { ok: true };

  const [userCountRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(users)
    .where(
      and(
        eq(users.tenantId, args.tenantId),
        sql`${users.status} <> 'Banned'`,
      ),
    );
  const [pendingInviteRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(invitations)
    .where(
      and(
        eq(invitations.tenantId, args.tenantId),
        eq(invitations.status, "pending"),
      ),
    );
  const activeUsers = Number(userCountRow?.c ?? 0);
  const pendingInvites = Number(pendingInviteRow?.c ?? 0);
  const projected = activeUsers + pendingInvites + (args.pending ?? 0);

  if (projected > max) {
    return {
      ok: false,
      reason: `Team seat cap reached (${activeUsers + pendingInvites}/${max}). Upgrade your plan to invite more.`,
      limit: max,
      current: activeUsers + pendingInvites,
    };
  }
  return { ok: true };
}

/**
 * Channels-per-worker cap. Counts the channels the caller wants to
 * attach to a single worker against plan.maxChannelsPerWorker.
 *
 * Pure arithmetic — no DB read needed because the worker we're about
 * to write IS the input. Called BEFORE `db.insert(workers)` /
 * `db.update(workers).set({ channels })`.
 */
export async function checkChannelsCap(args: {
  tenantId: string;
  channelCount: number;
}): Promise<LimitResult> {
  const planRow = await loadPlanForTenant(args.tenantId);
  if (!planRow) return { ok: false, reason: "tenant_not_found", limit: 0, current: 0 };
  const max = planRow.plan.maxChannelsPerWorker;
  if (max === -1) return { ok: true };

  if (args.channelCount > max) {
    return {
      ok: false,
      reason: `Channels-per-worker cap reached (${args.channelCount}/${max}). Upgrade your plan to attach more channels to a single worker.`,
      limit: max,
      current: args.channelCount,
    };
  }
  return { ok: true };
}

/**
 * Daily rollup helper. Aggregates today's `ai_usage` into
 * `tenant_ai_spend` for every tenant that had calls.
 *
 * Idempotent — uses ON CONFLICT (tenant_id, day) DO UPDATE so re-running
 * the rollup for the same day just refreshes the totals.
 *
 * Designed to be called once per day from a cron in BullMQ. It can also
 * run on demand from the audit script.
 */
export async function rollupSpend(args: { day: Date }): Promise<{
  tenantsProcessed: number;
}> {
  const dayIso = args.day.toISOString().slice(0, 10);
  // postgres-js doesn't auto-convert Date objects inside raw-SQL
  // template slots — pass ISO strings and cast at the SQL boundary.
  const startOfDayIso = `${dayIso}T00:00:00.000Z`;
  const endOfDayIso = `${dayIso}T23:59:59.999Z`;

  // Aggregate per tenant
  const buckets = await db.execute<{
    tenant_id: string;
    total_tokens: number;
    cost_microcents: number;
    call_count: number;
  }>(sql`
    SELECT
      ${aiUsage.tenantId} AS tenant_id,
      COALESCE(SUM(${aiUsage.promptTokens} + ${aiUsage.completionTokens}), 0)::bigint AS total_tokens,
      COALESCE(SUM(${aiUsage.costMicrocents}), 0)::bigint AS cost_microcents,
      COUNT(*)::int AS call_count
    FROM ${aiUsage}
    WHERE ${aiUsage.createdAt} >= ${startOfDayIso}::timestamptz
      AND ${aiUsage.createdAt} <= ${endOfDayIso}::timestamptz
      AND ${aiUsage.tenantId} IS NOT NULL
    GROUP BY ${aiUsage.tenantId}
  `);

  for (const b of buckets) {
    await db.execute(sql`
      INSERT INTO ${tenantAiSpend} (tenant_id, day, total_tokens, cost_microcents, call_count, rolled_up_at)
      VALUES (${b.tenant_id}, ${dayIso}, ${b.total_tokens}, ${b.cost_microcents}, ${b.call_count}, NOW())
      ON CONFLICT (tenant_id, day) DO UPDATE
      SET total_tokens = EXCLUDED.total_tokens,
          cost_microcents = EXCLUDED.cost_microcents,
          call_count = EXCLUDED.call_count,
          rolled_up_at = NOW()
    `);
  }

  return { tenantsProcessed: buckets.length };
}
