import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";
import { workers, conversations } from "./workers";
import { users } from "./users";

/**
 * Leads — outbound sales pipeline.
 *
 * One row per prospect. Imported in bulk (CSV upload in Sprint 11) or
 * one-by-one through the UI. The SDR worker pulls from this table to
 * draft personalized outreach.
 *
 * The `email` column is a UNIQUE constraint per tenant — we never want
 * to silently double-spend on the same person.
 */
export const leadStatusEnum = pgEnum("lead_status", [
  "new", //         imported, never contacted
  "queued", //      drafted outreach awaiting approval
  "contacted", //   outreach sent
  "replied", //     prospect responded
  "qualified", //   responded with intent (human flags)
  "unqualified", // not a fit
  "unsubscribed", // requested removal
  "bounced", //     email bounced
]);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Prospect's email — used as the dedupe key. */
    email: text("email").notNull(),
    /** Person's name (e.g. "Jane Doe"). */
    name: text("name"),
    company: text("company"),
    title: text("title"),
    phone: text("phone"),
    /** Where the lead came from — "csv", "webform", "manual", "linkedin". */
    source: text("source"),
    /** Free-form notes; the SDR worker reads these into its prompt. */
    notes: text("notes"),
    /** Tags / segments — fed into the worker as audience hints. */
    tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),

    status: leadStatusEnum("status").notNull().default("new"),
    /** Tenant-side owner — the human SDR responsible for the relationship. */
    ownerUserId: uuid("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    /** Last time we tried to send outreach (set by dispatcher). */
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),

    /** Free-form metadata (custom CRM fields, enrichment results, …). */
    metadata: jsonb("metadata").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("leads_tenant_email_unique").on(t.tenantId, t.email),
    index("leads_tenant_status_idx").on(t.tenantId, t.status),
  ],
);

/**
 * Support tickets — inbound from email or in-app.
 *
 * One ticket per (tenant, channel, external_thread_id) combination.
 * Replies on the same email thread re-open + append to the existing
 * ticket, not create a new one (matched via Message-ID / References).
 *
 * Conversations table also exists (Sprint 5) — but conversations are
 * stream-of-messages for AI worker chat. Tickets are a heavier object
 * with priority, assignee, SLA timestamps. They REFERENCE a conversation
 * (one ticket → one conversation) so the message history can be reused
 * by the assistant.
 */

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "critical",
  "high",
  "normal",
  "low",
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "pending",
  "resolved",
  "closed",
]);

export const ticketChannelEnum = pgEnum("ticket_channel", [
  "email", //   inbound email via /api/webhooks/inbound-email
  "in_app", //  from a logged-in customer using the in-app help
  "api", //     created programmatically via /api/tickets POST
  "widget", //  raised from the web chat widget (escalation)
]);

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Short pretty id for the UI ("TKT-001234"). */
    code: text("code").notNull(),

    subject: text("subject").notNull(),
    /** Latest body — full thread lives in the linked conversation. */
    bodyPreview: text("body_preview").notNull(),

    channel: ticketChannelEnum("channel").notNull(),
    priority: ticketPriorityEnum("priority").notNull().default("normal"),
    status: ticketStatusEnum("status").notNull().default("open"),

    /** Reporter identity hints. */
    reporterEmail: text("reporter_email").notNull(),
    reporterName: text("reporter_name"),

    /** Worker handling the triage / drafting replies. */
    assignedWorkerId: uuid("assigned_worker_id").references(() => workers.id, {
      onDelete: "set null",
    }),
    /** Human assignee on the staff side. */
    assignedUserId: uuid("assigned_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    /** Conversation that holds the message thread. */
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),

    /** External thread identifier — Message-ID for email, etc. Used for dedup. */
    externalThreadId: text("external_thread_id"),

    /** Triage result from the model. */
    triage: jsonb("triage"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [
    // A given channel+external-thread pair maps to exactly one ticket.
    // External thread id is allowed NULL (e.g. in_app tickets); the
    // partial index lets NULLs through.
    uniqueIndex("tickets_thread_unique")
      .on(t.tenantId, t.channel, t.externalThreadId)
      .where(sql`${t.externalThreadId} IS NOT NULL`),
    uniqueIndex("tickets_tenant_code_unique").on(t.tenantId, t.code),
    index("tickets_tenant_status_idx").on(t.tenantId, t.status, t.updatedAt),
    index("tickets_tenant_priority_idx").on(t.tenantId, t.priority, t.createdAt),
  ],
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
