import OpenAI from "openai";

/**
 * Singleton OpenAI client. Direct connection — no proxy.
 *
 * We do per-tenant cost metering ourselves by writing `ai_usage` rows
 * on each call (planned for Sprint 6). The `usage` field on every
 * OpenAI response gives us exact token counts; multiply by the model
 * price table (lib/ai/pricing.ts, Sprint 6) → cost. The data lands in
 * Postgres where Sprint 11's plan-paywall logic needs it anyway.
 *
 * Pricing-sensitive callers should pass `model` explicitly. Routing
 * + Anthropic fallback live in `src/lib/ai/router.ts` (Sprint 5).
 */

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey && process.env.NODE_ENV !== "test") {
  throw new Error("OPENAI_API_KEY is required");
}

declare global {
  var __staffbix_openai__: OpenAI | undefined;
}

export const openai: OpenAI =
  globalThis.__staffbix_openai__ ?? new OpenAI({ apiKey });

if (process.env.NODE_ENV !== "production") {
  globalThis.__staffbix_openai__ = openai;
}
