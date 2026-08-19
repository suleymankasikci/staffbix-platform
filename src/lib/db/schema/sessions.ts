import {
  pgTable,
  uuid,
  text,
  timestamp,
  inet,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { tenants } from "./tenants";

/**
 * Web session — gated by a successful email OTP per PRD §6.1.
 *
 * The session cookie carries a random 256-bit token. We store ONLY the
 * SHA-256 hash of that token here (`id_hash`). A DB leak alone is not
 * enough to hijack a session because the cookie value never touches disk.
 *
 * IP and UA fingerprint are captured at creation so we can fire a
 * "new device" alert the next time we see a different fingerprint for
 * the same user.
 */
export const sessions = pgTable(
  "sessions",
  {
    idHash: text("id_hash").primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    ip: inet("ip"),
    userAgent: text("user_agent"),
    deviceFingerprint: text("device_fingerprint"),

    // OTP gate: a freshly-issued session is `otp_pending`. The session is
    // not "logged in" until OTP succeeds and `otp_verified_at` is set.
    otpVerifiedAt: timestamp("otp_verified_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    index("sessions_user_idx").on(t.userId),
    index("sessions_expires_idx").on(t.expiresAt),
  ],
);

/**
 * Mobile refresh token — paired with a short-lived JWT access token.
 * One row per active device. Rotated on every refresh (single-use).
 */
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    idHash: text("id_hash").primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    deviceId: text("device_id").notNull(), // expo install id
    deviceLabel: text("device_label"), //     "iPhone 15 (Pro)"

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    // Set when this refresh token is consumed; points at its successor.
    // Detecting a re-use of an already-consumed token is the canonical
    // refresh-token-theft signal.
    rotatedToHash: text("rotated_to_hash"),
  },
  (t) => [
    index("refresh_tokens_user_idx").on(t.userId),
    index("refresh_tokens_device_idx").on(t.userId, t.deviceId),
  ],
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
