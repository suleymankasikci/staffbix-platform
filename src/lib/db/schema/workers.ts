import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";

/**
 * Hired AI workers. One row per "hire" of a role.
 *
 * `role_slug` references the in-memory `src/lib/roles.ts` registry —
 * not a DB FK. The registry is treated as a config artifact (changes
 * via PR, not by tenants), so a textual slug is sufficient and avoids
 * a CASCADE constraint that would prevent renaming roles.
 *
 * `autonomy` is the Approval Center setting (PRD §1.5): the tenant
 * decides whether the worker can act on its own, must wait for
 * approval, or only suggest. Defaults to `approve` for new hires —
 * deliberately conservative.
 */

export const workerStatusEnum = pgEnum("worker_status", [
  "active",
  "paused",
  "terminated",
]);

export const workerAutonomyEnum = pgEnum("worker_autonomy", [
  "auto", //     act without asking
  "approve", //  draft + wait for human approval
  "suggest", //  draft + leave for human to send (never autonomous)
]);

export const workers = pgTable(
  "workers",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Slug from `src/lib/roles.ts` — see comment above. */
    roleSlug: text("role_slug").notNull(),

    /** Display name; defaults to the role's `title` if user doesn't override. */
    name: text("name").notNull(),

    /** R2 key for the avatar — null when using a procedurally-generated default. */
    avatarUrl: text("avatar_url"),

    /**
     * Tenant-provided extra system-prompt instructions. Goes into the
     * final prompt AFTER the Brand Bible context but BEFORE the user
     * message, so it can shape tone/format without overriding facts.
     */
    customInstructions: text("custom_instructions"),

    /** Channels this worker is wired to: web, whatsapp, email, ... (Sprint 7). */
    channels: text("channels").array().notNull().default(sql`ARRAY[]::text[]`),

    status: workerStatusEnum("status").notNull().default("active"),
    autonomy: workerAutonomyEnum("autonomy").notNull().default("approve"),

    /**
     * Role-specific settings: spending limits, target audience, brand
     * voice notes, etc. Shape varies by role; see `src/lib/role-configs.ts`.
     */
    settings: jsonb("settings").notNull().default({}),

    /** Sticky overrides set on hire — model pinning, channel quotas. */
    modelPin: text("model_pin"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("workers_tenant_idx").on(t.tenantId, t.createdAt),
    index("workers_tenant_status_idx").on(t.tenantId, t.status),
    // One worker per (tenant, role_slug) for the MVP. Customers who want
    // two CS workers across two products can configure that in Sprint 7
    // by lifting this constraint — for now the simplicity is worth it.
    uniqueIndex("workers_tenant_role_unique").on(t.tenantId, t.roleSlug),
  ],
);

/**
 * One conversation per channel-session with a customer. A web visitor
 * starts one when they open the widget; WhatsApp/email DM threads each
 * map to one conversation.
 */
export const conversationChannelEnum = pgEnum("conversation_channel", [
  "web", //      embedded widget on tenant's site
  "whatsapp", // Sprint 7
  "email", //    Sprint 9
  "instagram", // Sprint 7
  "manual", //   created by staff for outbound (Sprint 9)
]);

export const conversationStatusEnum = pgEnum("conversation_status", [
  "open",
  "awaiting_human",
  "resolved",
  "abandoned",
]);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    workerId: uuid("worker_id")
      .notNull()
      .references(() => workers.id, { onDelete: "cascade" }),

    channel: conversationChannelEnum("channel").notNull(),
    status: conversationStatusEnum("status").notNull().default("open"),

    /**
     * Channel-side identifier — opaque widget session id for web, phone
     * number for WhatsApp, message-id thread for email. Unique within a
     * tenant + channel so we can dedupe.
     */
    externalId: text("external_id"),

    /** Free-form customer identity hints — name, email, locale, etc. */
    customer: jsonb("customer"),

    /** Last seen activity, used to age out abandoned conversations. */
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("conversations_tenant_status_idx").on(t.tenantId, t.status, t.lastMessageAt),
    index("conversations_tenant_worker_idx").on(t.tenantId, t.workerId),
    index("conversations_external_idx").on(t.tenantId, t.channel, t.externalId),
  ],
);

export const messageRoleEnum = pgEnum("message_role", [
  "system", //    composed system prompt at runtime; we don't store these
  "user", //      from the end-customer
  "assistant", // from the AI worker
  "human_agent", // staff takeover reply
  "tool", //      tool call result (Sprint 8+)
]);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),

    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),

    /** When a staff member took over, who. */
    authorUserId: uuid("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    /**
     * For assistant messages — the Brand Bible chunks fed into the
     * prompt. Stored so we can show "grounded in: …" in the inbox.
     */
    citedChunkIds: uuid("cited_chunk_ids").array(),

    /** Model + token totals — null for non-AI messages. */
    model: text("model"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    latencyMs: integer("latency_ms"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("messages_conversation_idx").on(t.conversationId, t.createdAt),
    index("messages_tenant_idx").on(t.tenantId, t.createdAt),
  ],
);

export type Worker = typeof workers.$inferSelect;
export type NewWorker = typeof workers.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
