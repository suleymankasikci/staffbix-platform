import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  date,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";

/**
 * Per-tenant per-day AI spend rollup.
 *
 * Written by a daily worker (Sprint 11's `tenant_spend_rollup` job)
 * that sums `ai_usage` rows by (tenant_id, calendar_day). The paywall
 * logic reads from this table on the hot path so plan-limit checks
 * don't hit the per-call ledger.
 *
 * We use UTC calendar days (`day`) as the bucketing dimension. Tenant
 * timezones come into play only when rendering — the cap math is in
 * dollars-per-calendar-month-UTC.
 */
export const tenantAiSpend = pgTable(
  "tenant_ai_spend",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** UTC date the rollup is for. */
    day: date("day").notNull(),

    /** Total prompt + completion tokens consumed across all calls. */
    totalTokens: bigint("total_tokens", { mode: "number" }).notNull().default(0),

    /** Sum of cost_microcents from ai_usage for the day. */
    costMicrocents: bigint("cost_microcents", { mode: "number" }).notNull().default(0),

    /** Number of upstream calls (any provider). */
    callCount: integer("call_count").notNull().default(0),

    /** When this row was rolled up. NULL until the worker writes it. */
    rolledUpAt: timestamp("rolled_up_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("tenant_ai_spend_tenant_day_unique").on(t.tenantId, t.day),
    index("tenant_ai_spend_day_idx").on(t.day),
  ],
);

/**
 * Platform invoices — Stripe is the source of truth, this table mirrors
 * the parts we need to render in `/admin/billing` without round-tripping
 * to Stripe on every page load. Updated by the webhook handler.
 *
 * Each row corresponds to one Stripe `invoice` object. We don't persist
 * line items, taxes, or coupon data — pull those from Stripe at the
 * moment a user opens an invoice for inspection.
 */
export const invoiceStatusEnum = pgEnum("platform_invoice_status", [
  "draft",
  "open",
  "paid",
  "past_due",
  "failed",
  "void",
  "refunded",
]);

export const platformInvoices = pgTable(
  "platform_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Stripe invoice id (`in_...`). Unique across all tenants. */
    stripeInvoiceId: text("stripe_invoice_id").notNull().unique(),

    /** Snapshot of the plan id at the moment the invoice was issued. */
    planId: text("plan_id").notNull(),

    /** Amount due, in cents (Stripe's smallest currency unit). */
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("usd"),

    status: invoiceStatusEnum("status").notNull().default("draft"),

    /** Stripe-hosted PDF URL — null until Stripe finalizes. */
    hostedInvoiceUrl: text("hosted_invoice_url"),
    pdfUrl: text("pdf_url"),

    issuedAt: timestamp("issued_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** Last failed-payment retry timestamp. */
    lastFailedAt: timestamp("last_failed_at", { withTimezone: true }),

    /** Free-form Stripe metadata mirror for debugging. */
    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("platform_invoices_tenant_status_idx").on(t.tenantId, t.status, t.issuedAt),
    index("platform_invoices_issued_idx").on(t.issuedAt),
  ],
);

export type TenantAiSpend = typeof tenantAiSpend.$inferSelect;
export type NewTenantAiSpend = typeof tenantAiSpend.$inferInsert;
export type PlatformInvoice = typeof platformInvoices.$inferSelect;
export type NewPlatformInvoice = typeof platformInvoices.$inferInsert;
