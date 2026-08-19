import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { brandBibleSources, brandBibleChunks } from "../db/schema";
import { parseDocument } from "./parser";
import { fetchUrlAsText } from "./fetch-url";
import { chunkText } from "./chunker";
import { embedTexts } from "../ai/embeddings";
import { downloadObject, deleteObject } from "../storage/r2";

/**
 * Brand Bible ingest pipeline — invoked by the BullMQ worker for every
 * job on the `brand-bible-ingest` queue.
 *
 * Flow:
 *   1. Load the source row, transition status `uploaded` → `parsing`.
 *   2. Parse the document (paste = passthrough, pdf/docx = extract text).
 *      Cache the result in `raw_text` so retries skip the parse step.
 *   3. Chunk the text.
 *   4. Embed all chunks in batched OpenAI calls.
 *   5. Insert chunks into Postgres in a transaction (so a mid-insert
 *      failure leaves no half-state).
 *   6. Transition status → `ready` with `chunk_count` populated.
 *
 * On any error, the status flips to `failed` with `error_message` set
 * and the function re-throws so BullMQ records the failure for retry.
 */

export async function ingestBrandBibleSource(args: {
  sourceId: string;
  tenantId: string;
}): Promise<{ chunkCount: number; tokens: number }> {
  // Load source — uses tenantId in the WHERE to enforce tenant isolation
  // even if the queue had a stale payload.
  const [source] = await db
    .select()
    .from(brandBibleSources)
    .where(eq(brandBibleSources.id, args.sourceId))
    .limit(1);

  if (!source) throw new Error(`source ${args.sourceId} not found`);
  if (source.tenantId !== args.tenantId) {
    throw new Error("tenant mismatch — payload corruption?");
  }

  try {
    // Mark parsing
    await db
      .update(brandBibleSources)
      .set({ status: "parsing", updatedAt: new Date(), errorMessage: null })
      .where(eq(brandBibleSources.id, source.id));

    // Step 2: parse. If we already have raw_text cached (re-ingest after
    // a chunk-step failure), reuse it.
    let text = source.rawText ?? "";
    let parseMetadata: Record<string, unknown> = {};

    if (!text) {
      if (source.kind === "paste") {
        // For paste sources, raw_text should always be populated at insert
        // time. If it's empty, we genuinely have nothing to embed.
        throw new Error("paste source has no raw_text");
      }
      if (source.kind === "url") {
        // Fetch the page server-side (SSRF-guarded), extract readable
        // text, and run it through the same chunk/embed pipeline as
        // file/paste sources. The URL is stored on metadata.url at
        // create time.
        const meta = (source.metadata as Record<string, unknown> | null) ?? {};
        const url = typeof meta.url === "string" ? meta.url : "";
        if (!url) throw new Error("url source missing metadata.url");
        const fetched = await fetchUrlAsText(url);
        text = fetched.text;
        parseMetadata = fetched.metadata;
        await db
          .update(brandBibleSources)
          .set({
            rawText: text,
            metadata: { ...meta, ...parseMetadata },
          })
          .where(eq(brandBibleSources.id, source.id));
        // Skip the file path below — we already have the text.
      } else {
        if (!source.r2Key) throw new Error("file source missing r2_key");
        const bytes = await downloadObject(source.r2Key);
        const parsed = await parseDocument({ kind: source.kind, bytes });
        text = parsed.text;
        parseMetadata = parsed.metadata;
        // Cache the extracted text so re-ingests skip the parse.
        await db
          .update(brandBibleSources)
          .set({
            rawText: text,
            metadata: { ...(source.metadata as object | null), ...parseMetadata },
          })
          .where(eq(brandBibleSources.id, source.id));
      }
    }

    if (text.trim().length === 0) {
      throw new Error("parsed document is empty");
    }

    // Step 3: chunk
    const chunks = chunkText(text, { title: source.title });
    if (chunks.length === 0) throw new Error("chunker produced 0 chunks");

    // Step 4: embed (batched 100/call inside embedTexts)
    await db
      .update(brandBibleSources)
      .set({ status: "embedding" })
      .where(eq(brandBibleSources.id, source.id));

    const embedded = await embedTexts(chunks.map((c) => c.text));
    if (embedded.length !== chunks.length) {
      throw new Error(
        `embedding count mismatch: ${embedded.length} ≠ ${chunks.length}`,
      );
    }
    const tokens = embedded.reduce((s, e) => s + e.tokensConsumed, 0);

    // Step 5: insert chunks in one transaction. Drop any old chunks first
    // so a re-ingest replaces atomically rather than duplicating.
    await db.transaction(async (tx) => {
      await tx
        .delete(brandBibleChunks)
        .where(eq(brandBibleChunks.sourceId, source.id));

      // Drizzle pgInsert with bulk values is supported; rows are constructed
      // with the embedding as a number[] which our customType converts.
      const rows = chunks.map((c, i) => ({
        tenantId: source.tenantId,
        sourceId: source.id,
        chunkIndex: c.index,
        content: c.text,
        tokenCount: embedded[i].tokensConsumed,
        embedding: embedded[i].embedding,
      }));
      await tx.insert(brandBibleChunks).values(rows);
    });

    // Step 6: ready
    await db
      .update(brandBibleSources)
      .set({
        status: "ready",
        chunkCount: chunks.length,
        updatedAt: new Date(),
        errorMessage: null,
      })
      .where(eq(brandBibleSources.id, source.id));

    return { chunkCount: chunks.length, tokens };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err);
    await db
      .update(brandBibleSources)
      .set({
        status: "failed",
        errorMessage: message.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(eq(brandBibleSources.id, source.id));
    throw err;
  }
}

/**
 * Delete a source and its underlying R2 object (if any). Chunks cascade
 * via the FK. Audit-log the deletion at the call site.
 */
export async function deleteBrandBibleSource(args: {
  sourceId: string;
  tenantId: string;
}): Promise<boolean> {
  const [source] = await db
    .select()
    .from(brandBibleSources)
    .where(eq(brandBibleSources.id, args.sourceId))
    .limit(1);
  if (!source || source.tenantId !== args.tenantId) return false;

  if (source.r2Key) {
    try {
      await deleteObject(source.r2Key);
    } catch (e) {
      // R2 delete failures shouldn't block the DB delete — log and move on.
      console.warn(`[brand-bible] R2 delete failed for ${source.r2Key}:`, e);
    }
  }
  await db.delete(brandBibleSources).where(eq(brandBibleSources.id, source.id));
  return true;
}
