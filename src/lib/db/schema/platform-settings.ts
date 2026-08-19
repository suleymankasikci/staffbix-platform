import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

/**
 * Platform-wide configuration as a flat key/value store.
 *
 * Sprint 15 adds this table to back the admin settings page (was local
 * useState mocks). Keys are short, stable identifiers — e.g.
 *   - `maintenance_mode`  → boolean
 *   - `signups_open`      → boolean
 *   - `trial_days`        → number
 *
 * Value is `jsonb` so a single table holds heterogeneous types without
 * an enum-per-shape. Callers MUST treat reads as `unknown` and validate.
 *
 * The bootstrap migration seeds three default keys so a fresh deploy has
 * a sensible read for the most common feature gates.
 */
export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),

  updatedBy: uuid("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type PlatformSetting = typeof platformSettings.$inferSelect;
export type NewPlatformSetting = typeof platformSettings.$inferInsert;
