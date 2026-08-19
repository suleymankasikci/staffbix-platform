import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

/**
 * The OTP table is intentionally simple. One row per code issued.
 * Codes are hashed at rest (SHA-256). Verification compares the
 * incoming hash; failed attempts increment `attempts`.
 *
 * PRD §6.1 caps issuance at 5 per email per 15 minutes — that limit
 * is enforced via `rate_limit_buckets`, not via this table.
 */
export const otpPurposeEnum = pgEnum("otp_purpose", [
  "web_login", //         every web session
  "signup_verify_email", // first-time email verification
  "password_reset",
  "new_device_confirm", // mobile login from an unrecognized device
]);

export const oneTimePasswords = pgTable(
  "one_time_passwords",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    purpose: otpPurposeEnum("purpose").notNull(),
    codeHash: text("code_hash").notNull(), // sha256(code + pepper)

    // Optional binding to the session that issued this OTP — prevents an
    // attacker from using an OTP intended for one device on another.
    bindSessionIdHash: text("bind_session_id_hash"),

    attempts: integer("attempts").notNull().default(0),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("otp_user_purpose_idx").on(t.userId, t.purpose),
    index("otp_expires_idx").on(t.expiresAt),
  ],
);

/**
 * Email verification links and password reset links.
 * Single-use, hex-encoded, 30-minute TTL (per PRD §6.1).
 */
export const verificationTokenKindEnum = pgEnum("verification_token_kind", [
  "email_verify",
  "password_reset",
  "team_invite",
]);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    idHash: text("id_hash").primaryKey(),

    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    kind: verificationTokenKindEnum("kind").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (t) => [
    index("verif_token_email_kind_idx").on(t.email, t.kind),
    index("verif_token_expires_idx").on(t.expiresAt),
  ],
);

export type OneTimePassword = typeof oneTimePasswords.$inferSelect;
export type NewOneTimePassword = typeof oneTimePasswords.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
