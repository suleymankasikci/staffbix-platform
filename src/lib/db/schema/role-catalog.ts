import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Catalog of hireable AI worker roles. Source of truth for both the
 * admin Catalog page (CRUD) and the customer-facing Workforce > Hire
 * pages. Was previously a hardcoded array in `src/lib/roles.ts`; the
 * audit (C-3 + C-9) moved it to the DB so platform staff can change
 * the catalog without a deploy.
 *
 * Slug is the primary key — used in URLs and worker provisioning. The
 * migration that creates this table also seeds it from the legacy
 * array so existing tenants don't lose any rows.
 */
export const roleCatalogStatusEnum = pgEnum("role_catalog_status", [
  "available",
  "q3",
]);

export const roleCatalogCategoryEnum = pgEnum("role_catalog_category", [
  "Customer-facing",
  "Sales",
  "Marketing",
  "Operations",
  "Finance",
  "Leadership",
]);

export const roleCatalog = pgTable(
  "role_catalog",
  {
    slug: text("slug").primaryKey(),
    title: text("title").notNull(),
    category: roleCatalogCategoryEnum("category").notNull(),
    summary: text("summary").notNull(),
    /** Newline-joined CSV is awkward; use a text[] for channels. */
    channels: text("channels").array().notNull().default(sql`'{}'::text[]`),
    status: roleCatalogStatusEnum("status").notNull().default("available"),
    /** Sort order for the catalog list. Lower = first. */
    sortOrder: text("sort_order").notNull().default("500"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("role_catalog_status_idx").on(t.status, t.category),
    index("role_catalog_category_idx").on(t.category),
  ],
);

export type RoleCatalogRow = typeof roleCatalog.$inferSelect;
export type NewRoleCatalogRow = typeof roleCatalog.$inferInsert;
