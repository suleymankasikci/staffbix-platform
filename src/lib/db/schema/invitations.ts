import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";
import { users, userRoleEnum } from "./users";

/**
 * Team invitations.
 *
 * One row per outstanding invite. The opaque invite token is delivered
 * via email; the DB stores only the SHA-256 hash so a read-only DB leak
 * cannot accept invites in your name.
 *
 * Acceptance flow:
 *   1. Owner / Admin calls POST /api/invitations with { email, role }
 *   2. We generate a 32-byte hex token, store its hash here, queue the
 *      email via the BullMQ `email` queue.
 *   3. Recipient clicks the link `/{lang}/accept/{token}` → page hashes
 *      the token, looks up the invite, shows "Set your password",
 *      creates a `users` row in the same tenant on submit.
 *
 * A given email can have at most one *pending* invite per tenant; if
 * the owner re-invites, we revoke the old one before creating the new.
 */
export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
]);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Owner who issued the invite — for audit. NULL if their account was deleted. */
    invitedBy: uuid("invited_by").references(() => users.id, {
      onDelete: "set null",
    }),

    /** Recipient email. Normalized to lowercase. */
    email: text("email").notNull(),

    /** Role the invitee will have once they accept. */
    role: userRoleEnum("role").notNull().default("Editor"),

    /** SHA-256 hash of the token included in the email URL. */
    tokenHash: text("token_hash").notNull().unique(),

    status: invitationStatusEnum("status").notNull().default("pending"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    /** Set when accepted — points at the freshly-created user row. */
    acceptedUserId: uuid("accepted_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    // A tenant can have at most one PENDING invite per email at a time.
    // Old invites stay in the table (status='revoked' or 'accepted') for audit.
    uniqueIndex("invitations_tenant_email_pending_idx")
      .on(t.tenantId, t.email)
      .where(sql`${t.status} = 'pending'`),
    index("invitations_tenant_status_idx").on(t.tenantId, t.status),
    index("invitations_email_idx").on(t.email),
    index("invitations_expires_idx").on(t.expiresAt),
  ],
);

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
