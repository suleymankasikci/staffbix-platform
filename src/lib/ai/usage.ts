import { db } from "../db/client";
import { aiUsage } from "../db/schema";
import { computeCostMicrocents } from "./pricing";

/**
 * Records one AI call in the `ai_usage` ledger. Called from inside the
 * usage-wrapped helpers in `embeddings.ts` / `chat.ts` after the
 * upstream API returns (or errors).
 *
 * Best-effort: a write failure here NEVER blocks the calling request.
 * If we lose a usage row the worst case is that one call doesn't count
 * toward the tenant's monthly spend cap; we'd rather under-count than
 * surface a 500 from a billing-side bug.
 */
export interface RecordAiUsageArgs {
  tenantId: string | null;
  workerId?: string | null;
  conversationId?: string | null;

  provider: "openai" | "anthropic";
  kind: "embedding" | "chat" | "completion";
  model: string;

  promptTokens: number;
  completionTokens: number;
  latencyMs: number | null;

  cacheHit?: boolean;
  errorCode?: string | null;
}

export async function recordAiUsage(args: RecordAiUsageArgs): Promise<void> {
  try {
    const costMicrocents = computeCostMicrocents(
      args.model,
      args.promptTokens,
      args.completionTokens,
    );
    await db.insert(aiUsage).values({
      tenantId: args.tenantId,
      workerId: args.workerId ?? null,
      conversationId: args.conversationId ?? null,
      provider: args.provider,
      kind: args.kind,
      model: args.model,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      costMicrocents,
      latencyMs: args.latencyMs,
      cacheHit: args.cacheHit ?? false,
      errorCode: args.errorCode ?? null,
    });
  } catch (err) {
    console.error(
      "[ai/usage] failed to record usage row (call will still complete):",
      err instanceof Error ? err.message : err,
    );
  }
}
