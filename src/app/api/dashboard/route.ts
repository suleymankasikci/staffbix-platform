import { NextResponse } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  workers,
  workerActions,
  conversations,
  messages,
  aiUsage,
} from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { listWorkersForUi, type WorkerListRow } from "@/lib/workers/list";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard — aggregate data for the tenant-facing dashboard.
 *
 * Returns the four headline KPIs (active workers, pending approvals,
 * messages in the last 7d, AI spend month-to-date in cents), the top 5
 * active workers (UI-shaped via `listWorkersForUi`), the last 10
 * worker_actions for the activity feed, and a per-channel conversation
 * count for the last 7 days. Wired into
 * `/app/[lang]/app/dashboard/page.tsx`.
 */

type DashboardResponse = {
  kpis: {
    activeWorkers: number;
    pendingApprovals: number;
    messages7d: number;
    aiSpendCentsThisMonth: number;
  };
  workforce: WorkerListRow[];
  recentActivity: Array<{
    id: string;
    at: string;
    workerName: string;
    kind: string;
    status: string;
    contentExcerpt: string;
  }>;
  channels: Array<{ name: string; count: number }>;
};

export async function GET(): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.tenantId;

  const throttled = await rateLimitOr429("chat", `tenant:${tenantId}`, {
    tenantId,
    userId: session.user.id,
    route: "GET /api/dashboard",
  });
  if (throttled) return throttled;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600_000);
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  // KPI 1 — active workers
  const [activeWorkersRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(workers)
    .where(and(eq(workers.tenantId, tenantId), eq(workers.status, "active")));

  // KPI 2 — pending approvals
  const [pendingApprovalsRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(workerActions)
    .where(
      and(
        eq(workerActions.tenantId, tenantId),
        eq(workerActions.status, "pending"),
      ),
    );

  // KPI 3 — messages in the last 7d (joined to conversations to scope by tenant)
  const [messages7dRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        eq(conversations.tenantId, tenantId),
        gte(messages.createdAt, sevenDaysAgo),
      ),
    );

  // KPI 4 — AI spend month-to-date in cents (cost_microcents → cents = /1e6)
  const [spendRow] = await db
    .select({
      microcents: sql<string>`COALESCE(SUM(${aiUsage.costMicrocents}), 0)::text`,
    })
    .from(aiUsage)
    .where(
      and(
        eq(aiUsage.tenantId, tenantId),
        gte(aiUsage.createdAt, monthStart),
      ),
    );
  const aiSpendCentsThisMonth = Math.round(
    Number(spendRow?.microcents ?? "0") / 1_000_000,
  );

  // Workforce — top 5 by activity. listWorkersForUi already excludes
  // terminated workers; sort by messages7d desc as a stand-in for "most
  // active" and slice to 5.
  const allWorkers = await listWorkersForUi({ tenantId });
  const workforce = allWorkers
    .filter((w) => w.status !== "terminated")
    .sort((a, b) => b.messages7d - a.messages7d)
    .slice(0, 5);

  // Recent activity — latest 10 worker_actions joined to the worker name.
  const activityRows = await db
    .select({
      id: workerActions.id,
      at: workerActions.createdAt,
      workerName: workers.name,
      kind: workerActions.kind,
      status: workerActions.status,
      content: workerActions.content,
    })
    .from(workerActions)
    .innerJoin(workers, eq(workers.id, workerActions.workerId))
    .where(eq(workerActions.tenantId, tenantId))
    .orderBy(desc(workerActions.createdAt))
    .limit(10);

  const recentActivity = activityRows.map((r) => ({
    id: r.id,
    at: r.at.toISOString(),
    workerName: r.workerName,
    kind: r.kind,
    status: r.status,
    contentExcerpt:
      r.content.length > 160 ? `${r.content.slice(0, 157)}…` : r.content,
  }));

  // Channels — group conversations by channel, last 7d.
  const channelRows = await db
    .select({
      channel: conversations.channel,
      c: sql<number>`count(*)::int`,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.tenantId, tenantId),
        gte(conversations.createdAt, sevenDaysAgo),
      ),
    )
    .groupBy(conversations.channel);

  const channels = channelRows
    .map((r) => ({ name: r.channel, count: Number(r.c ?? 0) }))
    .sort((a, b) => b.count - a.count);

  const out: DashboardResponse = {
    kpis: {
      activeWorkers: Number(activeWorkersRow?.c ?? 0),
      pendingApprovals: Number(pendingApprovalsRow?.c ?? 0),
      messages7d: Number(messages7dRow?.c ?? 0),
      aiSpendCentsThisMonth,
    },
    workforce,
    recentActivity,
    channels,
  };

  return NextResponse.json(out);
}
