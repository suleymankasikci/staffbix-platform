import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Platform staff — people with access to the admin panel.
 *
 * Distinct from `users` (which models tenant members). Sprint 15 lands
 * the table read/write so the team page renders real data; Sprint 19
 * will bolt an invite flow onto POST that issues a one-time invitation
 * email instead of a direct insert.
 *
 * Email is globally unique (one row per human). `lastSeenAt` is stamped
 * on every authenticated admin request by a separate middleware in a
 * later sprint — for now it stays NULL until that lands.
 */
export const staffRoleEnum = pgEnum("staff_role", [
  "owner",
  "engineer",
  "support",
  "analyst",
]);

export const staffStatusEnum = pgEnum("staff_status", [
  "active",
  "invited",
  "suspended",
]);

export const staff = pgTable("staff", {
  id: uuid("id").primaryKey().defaultRandom(),

  email: text("email").notNull().unique(),
  name: text("name").notNull(),

  role: staffRoleEnum("role").notNull().default("support"),
  status: staffStatusEnum("status").notNull().default("active"),

  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;
