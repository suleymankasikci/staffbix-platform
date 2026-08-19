import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";

/**
 * Generic bytea type — used by Sprint 18 to store the customer's TOTP
 * shared secret encrypted under the tenant DEK (envelope encryption).
 */
const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/** In-tenant role. Owner is the billing/legal owner of the tenant. */
export const userRoleEnum = pgEnum("user_role", [
  "Owner",
  "Admin",
  "Editor",
  "Reviewer",
]);

export const userStatusEnum = pgEnum("user_status", [
  "Active",
  "Invited",
  "Locked", //  exceeded failed-login threshold (Sprint 1, PRD §6.1)
  "Banned", //  platform-staff action only
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Every user belongs to exactly one tenant. Platform staff are modeled
    // separately in the `staff` table (Sprint 1.5).
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    email: text("email").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),

    // argon2id hash. Null only while the invite is outstanding.
    passwordHash: text("password_hash"),

    name: text("name").notNull(),
    locale: text("locale").notNull().default("en"),
    role: userRoleEnum("role").notNull().default("Editor"),
    status: userStatusEnum("status").notNull().default("Active"),

    // TOTP for admin/staff. Customers can opt-in in Sprint 12.
    // NOTE: `totpSecret` (plaintext text column) is the legacy admin/staff
    // field. Sprint 18 added customer-side TOTP that stores the RFC 6238
    // shared secret encrypted under the tenant DEK in `totpSecretBlob`.
    // Once existing admin enrolments have been migrated the legacy column
    // can be dropped.
    totpSecret: text("totp_secret"),
    totpSecretBlob: bytea("totp_secret_blob"),
    totpEnrolledAt: timestamp("totp_enrolled_at", { withTimezone: true }),
    /** SHA-256 (hex) hashes of single-use recovery codes — 10 per user. */
    totpRecoveryCodes: text("totp_recovery_codes").array(),
    mustChangePassword: boolean("must_change_password").notNull().default(false),

    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    failedLoginCount: integer("failed_login_count").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    // A given email can exist once per tenant. Same email across tenants is OK
    // — that's how a consultant logs into two clients with one address.
    uniqueIndex("users_tenant_email_unique").on(t.tenantId, t.email),
    index("users_email_idx").on(t.email),
    index("users_tenant_status_idx").on(t.tenantId, t.status),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
