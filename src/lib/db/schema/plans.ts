import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Plan catalog — Starter, Pro, Scale, Enterprise. Low-churn table; new
 * plans are added by a SQL migration, never by a customer-facing API.
 *
 * Why `id text` instead of an enum: enums require a migration to add new
 * values, which is exactly the wrong thing in Stripe-land where you may
 * spin up "Pro Annual" or "Scale Q3 promo" with no warning.
 *
 * Single source of truth for plan rows. Earlier sprints kept a
 * design-phase `PLATFORM_PLANS` array in `src/lib/admin-data.ts`; the
 * audit-fix sprint removed that mock and pointed the admin panel at
 * this table via /api/admin/plans.
 */
export const plans = pgTable(
  "plans",
  {
    id: text("id").primaryKey(), // "starter", "pro", "scale", "enterprise"
    name: text("name").notNull(),
    tagline: text("tagline").notNull(),

    // Stripe price ID — null for Enterprise (sales-quoted) and for plans
    // that haven't been provisioned in Stripe yet (CI seeds set this to
    // null; production seeds fill it in).
    stripePriceId: text("stripe_price_id"),

    // Cents per month. `0` for Enterprise (custom). Stripe is the source
    // of truth at charge time; this is for display only.
    priceMonthlyCents: integer("price_monthly_cents").notNull().default(0),
    currency: text("currency").notNull().default("usd"),

    // Soft limits enforced in app code on `withTenant(...)` boundaries.
    // Hard limits are enforced via DB constraints where reasonable.
    maxWorkers: integer("max_workers").notNull(), // -1 = unlimited
    maxMonthlyAiDollars: integer("max_monthly_ai_dollars").notNull(), // -1 = unlimited
    maxChannelsPerWorker: integer("max_channels_per_worker").notNull(),
    maxTeamSeats: integer("max_team_seats").notNull(), // -1 = unlimited

    // Feature flags for display + paywall. JSON keeps this flexible —
    // a flag is added by a SQL migration, callers check with
    // `plan.features.brand_bible_premium === true`.
    features: jsonb("features").notNull().default({}),

    // Visibility in the customer-facing pricing UI.
    isPublic: boolean("is_public").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("plans_sort_order_idx").on(t.sortOrder)],
);

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
