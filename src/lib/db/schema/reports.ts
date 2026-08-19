import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";

/**
 * Sprint 16 — Reports.
 *
 * Tenants and platform admins both write durable report definitions
 * here, and the run history lives in `report_runs`. The `kind` enum is
 * a fixed registry of supported queries; the runner switches on the
 * value and produces a JSON shape sized to fit a single row. Async
 * scheduling (BullMQ repeatable jobs keyed by `schedule`) lands in
 * Sprint 19 — until then the `schedule` column is purely descriptive
 * and "Run now" is the only execution path.
 *
 * Why two scopes share one table:
 *   - tenant_id IS NULL  → platform-wide report; only the staff /admin
 *     panel may read/write/run it. Backs the admin reports page.
 *   - tenant_id IS NOT NULL → owned by exactly one tenant; only that
 *     tenant's app session may read/write/run it. Backs the in-app
 *     `/app/reports` page.
 *
 * The runner enforces the same split: tenant-side kinds refuse to run
 * against a NULL tenant, and admin kinds refuse to run against a real
 * tenant. See `src/lib/reports/runner.ts`.
 */
export const reportKindEnum = pgEnum("report_kind", [
  // Tenant-scoped reports (require tenant_id IS NOT NULL):
  "workforce_volume", //     messages per worker per day, last 30d
  "ai_spend_daily", //       ai_usage cost per day, last 30d
  "approvals_throughput", // worker_actions status breakdown per day, last 30d

  // Admin-scoped reports (require tenant_id IS NULL):
  "billing_summary", //      MRR + signups + churn per month, last 12m
  "tenants_overview", //     tenant counts by plan and status
]);

export const reportRunStatusEnum = pgEnum("report_run_status", [
  "queued",
  "running",
  "completed",
  "failed",
]);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** NULL → platform-level admin report. */
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }),

    name: text("name").notNull(),
    kind: reportKindEnum("kind").notNull(),

    /** Per-kind config knobs (e.g. lookback window overrides). */
    config: jsonb("config").notNull().default({}),

    /**
     * Cron-like string, e.g. "0 0 * * 1" for "every Monday at 00:00 UTC".
     * NULL means "manual only". Sprint 19's BullMQ repeatable scheduler
     * will read this column; today it's display-only.
     */
    schedule: text("schedule"),

    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("reports_tenant_idx").on(t.tenantId, t.createdAt),
    index("reports_kind_idx").on(t.kind),
  ],
);

export const reportRuns = pgTable(
  "report_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),

    status: reportRunStatusEnum("status").notNull().default("queued"),

    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),

    /** Result payload — shape depends on the report's kind. */
    data: jsonb("data"),
    /** Populated when status='failed'. */
    error: text("error"),
    rowCount: integer("row_count"),
  },
  (t) => [index("report_runs_report_idx").on(t.reportId, t.startedAt)],
);

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type ReportRun = typeof reportRuns.$inferSelect;
export type NewReportRun = typeof reportRuns.$inferInsert;

export type ReportKind =
  | "workforce_volume"
  | "ai_spend_daily"
  | "approvals_throughput"
  | "billing_summary"
  | "tenants_overview";

export type ReportRunStatus = "queued" | "running" | "completed" | "failed";

/** Which kinds may be created/run by a tenant session. */
export const TENANT_REPORT_KINDS: ReadonlySet<ReportKind> = new Set<ReportKind>([
  "workforce_volume",
  "ai_spend_daily",
  "approvals_throughput",
]);

/** Which kinds may be created/run by an admin session at the platform scope. */
export const ADMIN_REPORT_KINDS: ReadonlySet<ReportKind> = new Set<ReportKind>([
  "billing_summary",
  "tenants_overview",
]);

export const ALL_REPORT_KINDS: ReadonlySet<ReportKind> = new Set<ReportKind>([
  ...TENANT_REPORT_KINDS,
  ...ADMIN_REPORT_KINDS,
]);
