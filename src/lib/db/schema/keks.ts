import {
  pgTable,
  uuid,
  integer,
  timestamp,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";

/**
 * Per-tenant Data Encryption Key (DEK) — Sprint 18.
 *
 * Each tenant has exactly one row here at any time. The `dek_wrapped`
 * column is the 32-byte AES-256 DEK wrapped with the platform master KEK
 * (`TENANT_KEK_MASTER`) using AES-256-GCM. Wrapped form is the 60-byte
 * pack `[12-byte IV][16-byte GCM tag][32-byte ciphertext]`. See
 * `src/lib/crypto/dek.ts` for the wrap/unwrap helpers.
 *
 * Rotation: `version` increments on every rotation and `rotated_at`
 * records the most recent. The rotation path re-encrypts every blob
 * column scoped to the tenant (today: `integrations.secret_blob` and
 * `users.totp_secret_blob`) and swaps the wrapped DEK in a single
 * transaction — see `rotateTenantDek` in `src/lib/crypto/dek.ts`.
 */
const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const tenantKeks = pgTable("tenant_keks", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),

  /** Wrapped DEK — 60 bytes: [12-byte IV][16-byte GCM tag][32-byte ciphertext]. */
  dekWrapped: bytea("dek_wrapped").notNull(),

  /** Bumps on every rotation. Embedded into version=2 ciphertext blobs. */
  version: integer("version").notNull().default(1),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  rotatedAt: timestamp("rotated_at", { withTimezone: true }),
});

export type TenantKek = typeof tenantKeks.$inferSelect;
export type NewTenantKek = typeof tenantKeks.$inferInsert;
