import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { plans } from "./plans";

/**
 * Lifecycle of a tenant in the platform.
 * - `trialing`: 14-day free trial, full feature access, no card on file.
 * - `active`:   card on file, in good standing.
 * - `past_due`: latest invoice failed, retrying nightly.
 * - `suspended`: workers disabled, login allowed for billing recovery.
 * - `canceled`: read-only export window, data wiped on day 30.
 */
export const tenantStatusEnum = pgEnum("tenant_status", [
  "trialing",
  "active",
  "past_due",
  "suspended",
  "canceled",
]);

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    country: text("country"),
    locale: text("locale").notNull().default("en"),
    timezone: text("timezone").notNull().default("UTC"),

    // Set on day 1 by /api/auth/register. Stripe customer is the source of
    // truth for billing identity; we never duplicate billing details locally.
    stripeCustomerId: text("stripe_customer_id"),
    planId: text("plan_id")
      .notNull()
      .default("starter")
      .references(() => plans.id, { onDelete: "restrict" }),
    status: tenantStatusEnum("status").notNull().default("trialing"),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),

    // Sprint 12 — used by /api/webhooks/inbound-email/[tenantId] to
    // verify the `x-inbound-secret` header sent by the tenant's email
    // forwarder. Rotated via the integrations UI. Nullable for tenants
    // that haven't enabled inbound email yet.
    inboundEmailSecret: text("inbound_email_secret"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("tenants_status_idx").on(t.status),
    index("tenants_stripe_customer_idx").on(t.stripeCustomerId),
  ],
);

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
