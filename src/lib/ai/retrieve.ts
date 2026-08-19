import { sql } from "drizzle-orm";
import { db } from "../db/client";
import { brandBibleChunks, brandBibleSources } from "../db/schema";
import { embedQuery, EMBEDDING_DIMENSIONS } from "./embeddings";

/**
 * Brand Bible retrieval. Given a natural-language query, returns the
 * top-k most relevant chunks for the tenant.
 *
 * Mechanics:
 *   1. Embed the query (1 OpenAI call, ~50ms p50).
 *   2. Cosine-distance ORDER BY with pgvector + HNSW.
 *   3. Join sources for the title + status (we filter out chunks whose
 *      source is no longer `ready` — e.g. mid-re-ingest).
 *
 * The tenantId is REQUIRED. Never call this without a tenant scope —
 * the where-clause is the only thing standing between Tenant A's query
 * and Tenant B's documents.
 */

export interface RetrievalHit {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  content: string;
  distance: number; // 0 = identical, 1 = orthogonal, 2 = opposite
  chunkIndex: number;
}

export async function searchBrandBible(args: {
  tenantId: string;
  query: string;
  k?: number;
  workerId?: string;
  conversationId?: string;
}): Promise<RetrievalHit[]> {
  if (!args.tenantId) throw new Error("searchBrandBible: tenantId is required");
  const k = args.k ?? 6;
  if (k <= 0 || k > 50) throw new Error("searchBrandBible: k must be in [1, 50]");
  const query = args.query.trim();
  if (!query) return [];

  const queryVector = await embedQuery(query, {
    tenantId: args.tenantId,
    workerId: args.workerId ?? null,
    conversationId: args.conversationId ?? null,
  });
  if (queryVector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `searchBrandBible: query vector has wrong dimensions (${queryVector.length} ≠ ${EMBEDDING_DIMENSIONS})`,
    );
  }

  // pgvector literal: `[v1,v2,...]`. Trust the cast at the SQL boundary.
  const literal = `[${queryVector.join(",")}]`;

  const rows = await db.execute<{
    chunk_id: string;
    source_id: string;
    source_title: string;
    content: string;
    distance: number;
    chunk_index: number;
  }>(sql`
    SELECT
      ${brandBibleChunks.id} AS chunk_id,
      ${brandBibleChunks.sourceId} AS source_id,
      ${brandBibleSources.title} AS source_title,
      ${brandBibleChunks.content} AS content,
      ${brandBibleChunks.chunkIndex} AS chunk_index,
      ${brandBibleChunks.embedding} <=> ${literal}::vector AS distance
    FROM ${brandBibleChunks}
    INNER JOIN ${brandBibleSources}
      ON ${brandBibleSources.id} = ${brandBibleChunks.sourceId}
    WHERE ${brandBibleChunks.tenantId} = ${args.tenantId}
      AND ${brandBibleSources.status} = 'ready'
    ORDER BY ${brandBibleChunks.embedding} <=> ${literal}::vector
    LIMIT ${k}
  `);

  return rows.map((r) => ({
    chunkId: r.chunk_id,
    sourceId: r.source_id,
    sourceTitle: r.source_title,
    content: r.content,
    distance: Number(r.distance),
    chunkIndex: r.chunk_index,
  }));
}
