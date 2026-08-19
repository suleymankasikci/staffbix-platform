import { openai } from "./openai";
import { recordAiUsage } from "./usage";

/**
 * Embedding helpers.
 *
 * `text-embedding-3-small` accepts arrays up to 2048 inputs per request,
 * with a hard cap of 300k total tokens. We batch in groups of 100 to
 * keep request bodies sane and to bound the blast radius if a single
 * batch fails (the worker retries the failed batch, not the whole
 * source).
 *
 * Every batch is recorded in `ai_usage` (best-effort — see
 * `recordAiUsage`). Pass `tenantId` so the row is attributable.
 */

export const EMBEDDING_MODEL = "text-embedding-3-small" as const;
export const EMBEDDING_DIMENSIONS = 1536 as const;
const BATCH_SIZE = 100;

export interface EmbeddedChunk {
  embedding: number[];
  /** Token count for this single input as reported by OpenAI. */
  tokensConsumed: number;
}

export interface EmbedAttribution {
  tenantId?: string | null;
  workerId?: string | null;
  conversationId?: string | null;
}

/**
 * Embed a list of texts. Returns one embedding per input, in input
 * order. If any batch fails, the error is propagated immediately — the
 * worker decides whether to retry or mark the source `failed`.
 *
 * Each upstream OpenAI call writes one `ai_usage` row, attributed to
 * the optional `tenantId` / `workerId` / `conversationId` if provided.
 */
export async function embedTexts(
  texts: string[],
  attribution: EmbedAttribution = {},
): Promise<EmbeddedChunk[]> {
  if (texts.length === 0) return [];
  const out: EmbeddedChunk[] = new Array(texts.length);

  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    const slice = texts.slice(start, start + BATCH_SIZE);
    const t0 = Date.now();
    let totalTokens = 0;
    let errorCode: string | null = null;
    try {
      const res = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: slice,
      });
      if (res.data.length !== slice.length) {
        throw new Error(
          `embedTexts: response size mismatch (sent ${slice.length}, got ${res.data.length})`,
        );
      }
      totalTokens = res.usage?.total_tokens ?? 0;
      // OpenAI returns aggregate usage for the batch; spread it evenly
      // across the inputs. Since input chunks are size-controlled by our
      // chunker, a flat average is close enough — the cost-of-record
      // lives on the `ai_usage` row at batch granularity.
      const perInput = Math.round(totalTokens / slice.length);
      for (let i = 0; i < slice.length; i++) {
        const datum = res.data[i];
        out[start + i] = {
          embedding: datum.embedding,
          tokensConsumed: perInput,
        };
      }
    } catch (err) {
      errorCode =
        (err as { code?: string; status?: number }).code ??
        String((err as { status?: number }).status ?? "unknown");
      // Still record the failed call for usage observability.
      await recordAiUsage({
        tenantId: attribution.tenantId ?? null,
        workerId: attribution.workerId ?? null,
        conversationId: attribution.conversationId ?? null,
        provider: "openai",
        kind: "embedding",
        model: EMBEDDING_MODEL,
        promptTokens: 0,
        completionTokens: 0,
        latencyMs: Date.now() - t0,
        errorCode,
      });
      throw err;
    }

    await recordAiUsage({
      tenantId: attribution.tenantId ?? null,
      workerId: attribution.workerId ?? null,
      conversationId: attribution.conversationId ?? null,
      provider: "openai",
      kind: "embedding",
      model: EMBEDDING_MODEL,
      promptTokens: totalTokens,
      completionTokens: 0,
      latencyMs: Date.now() - t0,
    });
  }

  return out;
}

/**
 * Embed a single query. Convenience wrapper for the search hot-path.
 */
export async function embedQuery(
  query: string,
  attribution: EmbedAttribution = {},
): Promise<number[]> {
  const [first] = await embedTexts([query], attribution);
  if (!first) throw new Error("embedQuery: empty response");
  return first.embedding;
}
