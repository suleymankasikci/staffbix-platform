import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  workers,
  conversations,
  messages,
  workerActions,
} from "../db/schema";
import { loadCatalogRoles } from "../roles-server";

/**
 * UI-shaped worker rows for the /app/workforce list + detail pages.
 *
 * Joins the raw `workers` table with rolling-7d aggregates from
 * `messages` (via `conversations`) and `worker_actions`. Each row is
 * shaped so the list page can render without touching anything else —
 * status mapping (active → "online"), role title lookup from the
 * roles registry, initials computed from the display name.
 *
 * The dashboard page and the detail page reuse the same shape so the
 * two paths can share copy + UI components.
 */

export type WorkerListRow = {
  id: string;
  initials: string;
  name: string;
  role: string; // human-readable title from the roles registry
  roleSlug: string;
  category: string;
  status: "online" | "idle" | "paused" | "terminated";
  channels: string[];
  languages: string[];
  approvalMode: "Automatic" | "Approval required" | "Suggestion only";
  autonomy: "auto" | "approve" | "suggest";
  hiredOn: string; // YYYY-MM-DD (UI formats)
  hiredAtISO: string; // full ISO for client-side formatting
  messages7d: number;
  approvals7d: number; // pending approvals count
  voiceMatch: number; // ratio of approved-as-drafted vs edited, 0-100
  schedule: string;
  customInstructions: string | null;
  modelPin: string | null;
  settings: Record<string, unknown>;
};

const APPROVAL_MODE_MAP: Record<
  "auto" | "approve" | "suggest",
  "Automatic" | "Approval required" | "Suggestion only"
> = {
  auto: "Automatic",
  approve: "Approval required",
  suggest: "Suggestion only",
};

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0] ?? "")
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "??"
  );
}

/**
 * "online" if the worker is active AND had a message in the last 24h.
 * "idle" if active but no recent activity. "paused" / "terminated"
 * pass through directly from the DB. This mapping is purely a UX hint
 * — the source of truth is `workers.status`.
 */
function statusOf(
  raw: "active" | "paused" | "terminated",
  lastActivity: Date | string | null,
): WorkerListRow["status"] {
  if (raw === "paused") return "paused";
  if (raw === "terminated") return "terminated";
  if (!lastActivity) return "idle";
  // postgres-js returns timestamptz from db.execute as ISO strings, but
  // through the typed `.select()` API they come back as Date objects.
  // Normalize either form here.
  const t =
    lastActivity instanceof Date ? lastActivity.getTime() : Date.parse(String(lastActivity));
  if (!Number.isFinite(t)) return "idle";
  const ageH = (Date.now() - t) / 3600_000;
  return ageH < 24 ? "online" : "idle";
}

interface AggregateRow {
  worker_id: string;
  messages_7d: number;
  approvals_pending: number;
  approvals_approved_7d: number;
  approvals_total_7d: number;
  last_activity: Date | null;
}

/**
 * Returns every worker on a tenant, enriched with the aggregates the
 * UI list expects. Excludes terminated workers by default — pass
 * `{ includeTerminated: true }` to see the full history.
 */
export async function listWorkersForUi(args: {
  tenantId: string;
  includeTerminated?: boolean;
}): Promise<WorkerListRow[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600_000);

  const whereExpr = args.includeTerminated
    ? eq(workers.tenantId, args.tenantId)
    : and(eq(workers.tenantId, args.tenantId), sql`${workers.status} <> 'terminated'`);

  const rows = await db
    .select({
      id: workers.id,
      name: workers.name,
      roleSlug: workers.roleSlug,
      status: workers.status,
      autonomy: workers.autonomy,
      channels: workers.channels,
      customInstructions: workers.customInstructions,
      modelPin: workers.modelPin,
      settings: workers.settings,
      createdAt: workers.createdAt,
    })
    .from(workers)
    .where(whereExpr);

  if (rows.length === 0) return [];

  // One round-trip for all aggregates, keyed by worker_id.
  const aggregates = await db.execute<AggregateRow & Record<string, unknown>>(sql`
    WITH msg_counts AS (
      SELECT c.worker_id AS worker_id, COUNT(m.id)::int AS cnt, MAX(m.created_at) AS last_msg
      FROM ${conversations} c
      LEFT JOIN ${messages} m
        ON m.conversation_id = c.id AND m.created_at >= ${sevenDaysAgo.toISOString()}::timestamptz
      WHERE c.tenant_id = ${args.tenantId}
      GROUP BY c.worker_id
    ),
    action_counts AS (
      SELECT
        worker_id,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status IN ('approved','sent','auto') AND created_at >= ${sevenDaysAgo.toISOString()}::timestamptz)::int AS approved_7d,
        COUNT(*) FILTER (WHERE created_at >= ${sevenDaysAgo.toISOString()}::timestamptz)::int AS total_7d
      FROM ${workerActions}
      WHERE tenant_id = ${args.tenantId}
      GROUP BY worker_id
    )
    SELECT
      w.id AS worker_id,
      COALESCE(mc.cnt, 0) AS messages_7d,
      COALESCE(ac.pending, 0) AS approvals_pending,
      COALESCE(ac.approved_7d, 0) AS approvals_approved_7d,
      COALESCE(ac.total_7d, 0) AS approvals_total_7d,
      mc.last_msg AS last_activity
    FROM ${workers} w
    LEFT JOIN msg_counts mc ON mc.worker_id = w.id
    LEFT JOIN action_counts ac ON ac.worker_id = w.id
    WHERE w.tenant_id = ${args.tenantId}
  `);

  const aggMap = new Map<string, AggregateRow>();
  for (const a of aggregates as Iterable<AggregateRow>) aggMap.set(a.worker_id, a);

  // Single catalog fetch — building a slug→role map up-front beats
  // N round-trips inside the map() below.
  const catalog = await loadCatalogRoles();
  const roleMap = new Map(catalog.map((r) => [r.slug, r]));

  return rows.map((r: typeof rows[number]) => {
    const role = roleMap.get(r.roleSlug);
    const agg = aggMap.get(r.id);
    const voiceMatch =
      agg && agg.approvals_total_7d > 0
        ? Math.round((agg.approvals_approved_7d / agg.approvals_total_7d) * 100)
        : 100;
    return {
      id: r.id,
      initials: initialsOf(r.name),
      name: r.name,
      role: role?.title ?? r.roleSlug.replace(/-/g, " "),
      roleSlug: r.roleSlug,
      category: role?.category ?? "—",
      status: statusOf(r.status, agg?.last_activity ?? null),
      channels: r.channels,
      languages: ["EN"], // Sprint 12: per-worker languages — wire to settings.languages
      approvalMode: APPROVAL_MODE_MAP[r.autonomy as "auto" | "approve" | "suggest"],
      autonomy: r.autonomy as "auto" | "approve" | "suggest",
      hiredOn: r.createdAt.toISOString().slice(0, 10),
      hiredAtISO: r.createdAt.toISOString(),
      messages7d: agg?.messages_7d ?? 0,
      approvals7d: agg?.approvals_pending ?? 0,
      voiceMatch,
      schedule: "24/7", // Sprint 12: read from settings.schedule when configured
      customInstructions: r.customInstructions,
      modelPin: r.modelPin,
      settings: (r.settings as Record<string, unknown>) ?? {},
    };
  });
}

/**
 * One worker, enriched (same shape as `listWorkersForUi` rows). Returns
 * null if the worker doesn't belong to the tenant.
 */
export async function loadWorkerForUi(args: {
  tenantId: string;
  workerId: string;
}): Promise<WorkerListRow | null> {
  const all = await listWorkersForUi({
    tenantId: args.tenantId,
    includeTerminated: true,
  });
  return all.find((w) => w.id === args.workerId) ?? null;
}
