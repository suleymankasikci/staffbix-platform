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
import { workers } from "./workers";
import { users } from "./users";

/**
 * Content briefs — the owner's prompt to a marketing worker.
 *
 * "Write 3 LinkedIn posts about our new feature, professional tone,
 * mention pricing tier." → one content_brief row → the worker fans
 * this out into N drafts (one per channel × variant), each landing as
 * a worker_action(kind='social_post') in the Approval Center.
 *
 * A brief is the input; the resulting worker_action rows are the output.
 * We keep the brief row around even after dispatch so the owner can
 * see "what we asked for last time" and re-run it on demand.
 */

export const briefStatusEnum = pgEnum("content_brief_status", [
  "drafting", //  worker is generating the variants
  "ready", //     all variants drafted, awaiting approval
  "partially_sent", // some approved + sent, others pending
  "completed", // all variants resolved (sent or rejected)
  "failed", //    generation step errored
]);

export const contentBriefs = pgTable(
  "content_briefs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    workerId: uuid("worker_id")
      .notNull()
      .references(() => workers.id, { onDelete: "cascade" }),

    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    /** Short headline for the owner ("LinkedIn launch posts"). */
    title: text("title").notNull(),

    /** The actual brief — what the worker should write about. */
    briefText: text("brief_text").notNull(),

    /** Which channels the worker should produce drafts for. */
    targetChannels: text("target_channels")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),

    /** How many variants per channel — defaults to 1. */
    variantsPerChannel: integer("variants_per_channel").notNull().default(1),

    status: briefStatusEnum("status").notNull().default("drafting"),

    /** Free-form params (tone, audience, restrictedTopics, etc.). */
    parameters: jsonb("parameters").notNull().default({}),

    /** Last error during draft generation, if any. */
    errorMessage: text("error_message"),

    /** Worker_action ids generated from this brief — denormalized for
     *  cheap "what did we produce?" queries. */
    actionIds: uuid("action_ids").array(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("content_briefs_tenant_idx").on(t.tenantId, t.createdAt),
    index("content_briefs_worker_idx").on(t.workerId, t.createdAt),
    index("content_briefs_status_idx").on(t.tenantId, t.status),
  ],
);

/**
 * SEO audits — input is a URL, output is a Brand-Bible-aware audit:
 *   - One-line summary of what the page is for
 *   - Title + meta description suggestions
 *   - Tone/voice critique vs. Brand Bible
 *   - Top fixes ranked by impact
 *
 * Designed to be re-runnable — the same URL can be audited multiple
 * times as the page evolves. Each run lives as its own row.
 */
export const seoAuditStatusEnum = pgEnum("seo_audit_status", [
  "fetching", //  retrieving the URL contents
  "analyzing", // running through the model
  "ready", //     audit JSON is populated
  "failed", //    fetch or analysis errored
]);

export const seoAudits = pgTable(
  "seo_audits",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    workerId: uuid("worker_id").references(() => workers.id, {
      onDelete: "set null",
    }),

    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    url: text("url").notNull(),
    status: seoAuditStatusEnum("status").notNull().default("fetching"),

    /** Raw HTML captured at audit time. Trimmed to 200 KB before storage. */
    fetchedHtml: text("fetched_html"),
    /** Plain-text body extracted from the HTML, for the LLM. */
    fetchedText: text("fetched_text"),
    /** HTTP status from the upstream fetch — 0 if network error. */
    fetchStatus: integer("fetch_status"),

    /** Structured audit output from the model. */
    result: jsonb("result"),
    errorMessage: text("error_message"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("seo_audits_tenant_idx").on(t.tenantId, t.createdAt),
    index("seo_audits_status_idx").on(t.tenantId, t.status),
  ],
);

export type ContentBrief = typeof contentBriefs.$inferSelect;
export type NewContentBrief = typeof contentBriefs.$inferInsert;
export type SeoAudit = typeof seoAudits.$inferSelect;
export type NewSeoAudit = typeof seoAudits.$inferInsert;
