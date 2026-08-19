import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

/**
 * Platform-wide broadcast banners shown in every customer's app.
 *
 * Sprint 15 introduces this table to back the admin announcements page —
 * before, the page held an in-memory mock. Composition, scheduling, and
 * lifecycle (draft → scheduled → live → ended) all live on this row.
 *
 * `audience` segments which tenants see the banner. The customer-facing
 * widget filters by the tenant's current plan/status when reading the
 * "live" set.
 *
 * `createdBy` is the staff member who authored the row (set null on
 * delete so the audit trail survives the user being removed).
 */
export const announcementStatusEnum = pgEnum("announcement_status", [
  "draft",
  "scheduled",
  "live",
  "ended",
]);

export const announcementSeverityEnum = pgEnum("announcement_severity", [
  "info",
  "notice",
  "critical",
]);

export const announcementAudienceEnum = pgEnum("announcement_audience", [
  "all",
  "free_trial",
  "paid",
  "enterprise",
]);

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    title: text("title").notNull(),
    body: text("body").notNull(),

    audience: announcementAudienceEnum("audience").notNull().default("all"),
    severity: announcementSeverityEnum("severity").notNull().default("info"),
    status: announcementStatusEnum("status").notNull().default("draft"),

    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),

    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("announcements_status_idx").on(t.status, t.startsAt)],
);

export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
