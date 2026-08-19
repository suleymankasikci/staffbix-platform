import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";
import { workers, conversations, messages } from "./workers";
import { users } from "./users";

/**
 * Outbound actions a worker wants to take.
 *
 * Created by the worker runtime whenever:
 *   - autonomy = 'auto'    → row is inserted with status='auto', then
 *                            immediately dispatched (still recorded for audit)
 *   - autonomy = 'approve' → status='pending', owner must approve
 *   - autonomy = 'suggest' → status='pending', owner may approve OR
 *                            simply use the draft text manually
 *
 * Once approved, the dispatch worker picks up the row, performs the
 * side effect (send reply via the channel adapter), and writes
 * status='sent' + dispatched_at. Errors flip to status='failed' with
 * `error` populated.
 *
 * Today (Sprint 6) only the `web_reply` kind exists — it appends a
 * message to the originating conversation. Sprint 7+ adds
 * `whatsapp_reply`, `email_reply`, `social_post`, etc.
 */
export const actionKindEnum = pgEnum("worker_action_kind", [
  "web_reply", //   reply on the web widget conversation
  "whatsapp_reply", // Sprint 7
  "email_send", //  Sprint 9
  "social_post", // Sprint 8
]);

export const actionStatusEnum = pgEnum("worker_action_status", [
  "pending", //   waiting for human approval
  "approved", //  approved, queued for dispatch
  "sent", //      successfully dispatched
  "rejected", //  human rejected — never dispatched
  "auto", //      bypassed approval queue (autonomy=auto path)
  "failed", //    dispatch errored out
]);

export const workerActions = pgTable(
  "worker_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    workerId: uuid("worker_id")
      .notNull()
      .references(() => workers.id, { onDelete: "cascade" }),

    /** Conversation this action belongs to (always set today; channels
     *  without a conversation concept can leave it null later). */
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),

    /**
     * Pointer to the assistant message that this action was drafted from.
     * The message stays in the conversation with `role='assistant'`
     * regardless of whether the action is approved — the customer just
     * doesn't SEE it until status='sent' or 'auto'.
     */
    draftMessageId: uuid("draft_message_id").references(() => messages.id, {
      onDelete: "set null",
    }),

    kind: actionKindEnum("kind").notNull(),
    status: actionStatusEnum("status").notNull().default("pending"),

    /** The exact text the worker wants to send. */
    content: text("content").notNull(),

    /** Free-form per-kind details (recipient phone for whatsapp, etc.). */
    payload: jsonb("payload").notNull().default({}),

    /** Who acted on this row, when. */
    decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decisionNotes: text("decision_notes"),

    /** Set once the dispatcher actually sent the message. */
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    /** Last error from the dispatcher; null on success. */
    error: text("error"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("worker_actions_tenant_status_idx").on(t.tenantId, t.status, t.createdAt),
    index("worker_actions_conversation_idx").on(t.conversationId),
    index("worker_actions_pending_idx")
      .on(t.tenantId, t.createdAt)
      .where(sql`${t.status} = 'pending'`),
  ],
);

/**
 * Expo push tokens registered by user devices. Multiple devices per
 * user → multiple rows. We send approval notifications to every
 * non-revoked subscription for the owner/admins of the tenant.
 */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /** Expo push token — opaque, looks like "ExponentPushToken[xxx]" */
    expoToken: text("expo_token").notNull().unique(),

    /** Device label for the UI ("iPhone 15", "Pixel 8 Pro"). */
    deviceLabel: text("device_label"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    index("push_subscriptions_user_idx").on(t.userId),
    index("push_subscriptions_tenant_idx").on(t.tenantId),
  ],
);

export type WorkerAction = typeof workerActions.$inferSelect;
export type NewWorkerAction = typeof workerActions.$inferInsert;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
