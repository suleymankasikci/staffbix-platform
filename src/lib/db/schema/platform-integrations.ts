import {
  pgTable,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Platform-level integrations catalog (Anthropic, Stripe, Resend, etc.)
 * Distinct from the per-tenant `integrations` table — that one holds
 * each tenant's WhatsApp/SMTP creds; this one is the registry of
 * services the platform itself depends on, with health labels staff
 * can flip during incidents.
 *
 * Promoted from a hardcoded array in
 * `src/app/admin/(panel)/integrations/page.tsx` per audit C-8.
 */
export const platformIntegrationCategoryEnum = pgEnum(
  "platform_integration_category",
  ["Channel", "AI provider", "Payments", "Email", "Storage", "Telemetry"],
);

export const platformIntegrationStatusEnum = pgEnum(
  "platform_integration_status",
  ["Live", "Degraded", "Disabled"],
);

export const platformIntegrations = pgTable(
  "platform_integrations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category: platformIntegrationCategoryEnum("category").notNull(),
    status: platformIntegrationStatusEnum("status").notNull().default("Live"),
    hint: text("hint").notNull().default(""),
    /** Snapshot tenant-install count. Worker refreshes this periodically. */
    tenantsInstalled: integer("tenants_installed").notNull().default(0),
    sortOrder: text("sort_order").notNull().default("500"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("platform_integrations_status_idx").on(t.status, t.category),
    index("platform_integrations_category_idx").on(t.category),
  ],
);

export type PlatformIntegrationRow = typeof platformIntegrations.$inferSelect;
export type NewPlatformIntegrationRow =
  typeof platformIntegrations.$inferInsert;
