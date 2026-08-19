import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  index,
  inet,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Inbound submissions from the public contact form
 * (`/api/contact`, posted from `[lang]/contact`). Stored so staff can
 * triage without piping every message through email. No tenantId — this
 * is the marketing-site contact channel, before any tenant exists.
 */
export const contactMessageStatusEnum = pgEnum("contact_message_status", [
  "new",
  "in_progress",
  "answered",
  "spam",
  "closed",
]);

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    company: text("company"),
    topic: text("topic").notNull(),
    message: text("message").notNull(),
    locale: text("locale"),
    sourceIp: inet("source_ip"),
    userAgent: text("user_agent"),
    status: contactMessageStatusEnum("status").notNull().default("new"),
    handledBy: text("handled_by"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("contact_messages_status_idx").on(t.status, t.createdAt),
    index("contact_messages_email_idx").on(t.email),
  ],
);

export type ContactMessage = typeof contactMessages.$inferSelect;
export type NewContactMessage = typeof contactMessages.$inferInsert;
