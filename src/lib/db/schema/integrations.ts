import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  jsonb,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";

/**
 * BYOI — Bring Your Own Integrations.
 *
 * One row per credential the tenant has connected: WhatsApp Cloud API
 * phone+token, customer SMTP creds, Instagram OAuth tokens, etc.
 *
 * The actual secret material is AES-256-GCM encrypted with the master
 * KEK (TENANT_KEK_MASTER) — see `src/lib/crypto/encrypt.ts`. Even with
 * read access to the DB nobody can recover a WhatsApp access token
 * without the KEK that lives in Railway secrets.
 *
 * Plaintext fields:
 *   - `display_name`: shown in the UI ("Northway Sales WhatsApp")
 *   - `external_id`: provider-side identifier (phone number id for
 *     WhatsApp, account id for IG, "smtp" for plain SMTP) — used to
 *     route inbound webhooks back to a tenant.
 *   - `metadata`: free-form provider hints (sender_name, region, etc.)
 *
 * Encrypted blob (`secret_blob`) — provider-specific JSON shape:
 *   whatsapp:    { phoneNumberId, accessToken, appSecret, verifyToken }
 *   email_smtp:  { host, port, user, pass, fromAddress, useTls }
 *   instagram:   { pageId, accessToken, appSecret, verifyToken }
 *   twitter:     { accessToken, refreshToken, expiresAt, scope, userId, username }
 *   linkedin:    { accessToken, expiresAt, authorUrn, name }
 */

export const integrationKindEnum = pgEnum("integration_kind", [
  "whatsapp",
  "email_smtp",
  "instagram",
  "twitter", //  X (Twitter) OAuth2 + PKCE — tweet.write
  "linkedin", // LinkedIn OAuth2 — w_member_social
]);

export const integrationStatusEnum = pgEnum("integration_status", [
  "active",
  "paused",
  "broken", //   recent test or webhook failed; show banner in UI
  "disconnected", // tenant manually disconnected; row kept for audit
]);

/** AES-256-GCM encrypted secret blob: [12-byte IV][16-byte tag][ciphertext]. */
const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    kind: integrationKindEnum("kind").notNull(),
    status: integrationStatusEnum("status").notNull().default("active"),

    /** Tenant-set label visible in the UI. */
    displayName: text("display_name").notNull(),

    /**
     * Provider-side identifier — used by the inbound webhook router to
     * locate the tenant for an incoming Meta event when the payload
     * doesn't carry our tenantId (`metadata.phone_number_id` arrives,
     * we look up the integration by `external_id`).
     */
    externalId: text("external_id"),

    /** Encrypted JSON blob — see header comment for per-kind shape. */
    secretBlob: bytea("secret_blob").notNull(),

    /** Plaintext provider hints. NEVER store secrets here. */
    metadata: jsonb("metadata").notNull().default({}),

    /** When we last successfully sent / verified. NULL = never tested. */
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    /** Last error from a failed test or dispatch — shown in the UI. */
    lastError: text("last_error"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("integrations_tenant_kind_idx").on(t.tenantId, t.kind),
    index("integrations_tenant_status_idx").on(t.tenantId, t.status),
    // The external_id is what inbound webhooks key off of (e.g. Meta
    // sends us `phone_number_id` and we need to find the matching
    // tenant). One external_id per kind across all tenants.
    uniqueIndex("integrations_kind_external_id_unique")
      .on(t.kind, t.externalId)
      .where(sql`${t.externalId} IS NOT NULL`),
  ],
);

export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;
