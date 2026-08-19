import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";

/**
 * AI usage ledger — one row per API call to OpenAI or Anthropic.
 *
 * Written synchronously inside the `usage.ts` wrapper that every AI
 * call goes through. Sprint 11's paywall logic sums by tenant + day
 * to enforce monthly $ caps. Sprint 12's Axiom integration mirrors
 * each row as a log line for the AI dashboard.
 *
 * The cost is computed *at write time* from `src/lib/ai/pricing.ts`
 * so a future price change doesn't retroactively rewrite history.
 */

export const aiProviderEnum = pgEnum("ai_provider", ["openai", "anthropic"]);
export const aiCallKindEnum = pgEnum("ai_call_kind", [
  "embedding", //   text-embedding-3-small etc.
  "chat", //        chat.completions / messages
  "completion", //  legacy completion endpoint (not used today)
]);

export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),

    /** Worker that initiated the call, if any. */
    workerId: uuid("worker_id"),

    /** Internal conversation/message ID if this call was part of one. */
    conversationId: uuid("conversation_id"),

    provider: aiProviderEnum("provider").notNull(),
    kind: aiCallKindEnum("kind").notNull(),
    model: text("model").notNull(),

    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),

    /** Cost in microcents (1/1,000,000 USD) — fits exact-arithmetic in int32. */
    costMicrocents: integer("cost_microcents").notNull().default(0),

    latencyMs: integer("latency_ms"),

    /** Was this served from our prompt cache instead of the upstream API? */
    cacheHit: boolean("cache_hit").notNull().default(false),

    /** Upstream API error code if the call failed. NULL = success. */
    errorCode: text("error_code"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    // Hot path: "how much has tenant X spent today/this month?"
    index("ai_usage_tenant_created_idx").on(t.tenantId, t.createdAt),
    // For provider-level views (admin observability)
    index("ai_usage_provider_created_idx").on(t.provider, t.createdAt),
  ],
);

export type AiUsageRow = typeof aiUsage.$inferSelect;
export type NewAiUsageRow = typeof aiUsage.$inferInsert;
