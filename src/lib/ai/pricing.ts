/**
 * Model price table (USD per 1M tokens) sourced from vendor pricing
 * pages. Update via PR — every change is a deliberate review of the
 * vendor's latest published numbers. NEVER guess.
 *
 * Sources & verification timestamps:
 *   - OpenAI:    developers.openai.com/api/docs/pricing — verified by
 *                screenshot on 2026-05-14.
 *   - Anthropic: platform.claude.com/docs/en/docs/about-claude/models/overview
 *                — fetched 2026-05-14.
 *
 * The middle "cached input" tier on OpenAI's table is ignored here —
 * MVP doesn't use prompt caching yet (Sprint 12 considers it). We
 * record the headline input price.
 *
 * Cost is computed at write time in `lib/ai/usage.ts` so a future
 * price change does not retroactively rewrite history.
 */

export interface ModelPrice {
  inputPer1m: number; // USD per 1,000,000 input tokens
  outputPer1m: number; // USD per 1,000,000 output tokens; 0 for embeddings
}

export const MODEL_PRICES: Record<string, ModelPrice> = {
  // ── OpenAI — chat ──────────────────────────────────────────────────────
  "gpt-4o-mini": { inputPer1m: 0.15, outputPer1m: 0.6 },
  "gpt-4o": { inputPer1m: 2.5, outputPer1m: 10.0 },
  "gpt-4.1": { inputPer1m: 2.0, outputPer1m: 8.0 },
  "gpt-4.1-mini": { inputPer1m: 0.4, outputPer1m: 1.6 },
  "gpt-4.1-nano": { inputPer1m: 0.1, outputPer1m: 0.4 },
  "gpt-5": { inputPer1m: 1.25, outputPer1m: 10.0 },
  "gpt-5-mini": { inputPer1m: 0.25, outputPer1m: 2.0 },
  "gpt-5-nano": { inputPer1m: 0.05, outputPer1m: 0.4 },

  // ── OpenAI — embeddings ────────────────────────────────────────────────
  "text-embedding-3-small": { inputPer1m: 0.02, outputPer1m: 0 },
  "text-embedding-3-large": { inputPer1m: 0.13, outputPer1m: 0 },

  // ── Anthropic — current generation ─────────────────────────────────────
  "claude-haiku-4-5": { inputPer1m: 1.0, outputPer1m: 5.0 },
  "claude-sonnet-4-6": { inputPer1m: 3.0, outputPer1m: 15.0 },
  "claude-opus-4-7": { inputPer1m: 5.0, outputPer1m: 25.0 },
};

/**
 * Cost in microcents (1/1,000,000 USD). int32-safe up to ~$2,147 per
 * single call — far above any realistic budget.
 *
 * If the model isn't in the table we return 0 and log a warning. The
 * `ai_usage` row still gets written so the call is auditable; the
 * cost-of-record is just missing until the price is added.
 */
export function computeCostMicrocents(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const price = MODEL_PRICES[model];
  if (!price) {
    console.warn(
      `[ai/pricing] unknown model '${model}' — cost recorded as 0. Add it to MODEL_PRICES.`,
    );
    return 0;
  }
  // microcents = (tokens / 1M) * (price USD) * 100 cents * 1M microcents
  //            = tokens * price * 100
  const inputMicrocents = promptTokens * price.inputPer1m * 100;
  const outputMicrocents = completionTokens * price.outputPer1m * 100;
  return Math.round(inputMicrocents + outputMicrocents);
}
