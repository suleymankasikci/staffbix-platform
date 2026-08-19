import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
  customType,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";

/**
 * Brand Bible — the tenant-owned knowledge base every AI worker reads
 * from at runtime.
 *
 * Two tables:
 *   - `brand_bible_sources` — one row per uploaded document or pasted text.
 *     Tracks the lifecycle (uploaded → parsing → embedding → ready / failed).
 *   - `brand_bible_chunks` — pgvector embeddings of the text. One row per
 *     chunk of ~800 tokens, with a foreign key to the source.
 *
 * At query time we run `SELECT ... ORDER BY embedding <=> $query LIMIT 6`
 * with an HNSW index for cosine distance.
 */

/**
 * Drizzle has no first-class pgvector column type yet. Roll our own using
 * `customType`. We render the input as a `[0.1,0.2,...]` string (the
 * pgvector accepted format) and trust the SQL side to parse.
 */
export const vector = (name: string, dimensions: number) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${dimensions})`;
    },
    toDriver(value: number[]) {
      return `[${value.join(",")}]`;
    },
  })(name);

/**
 * Lifecycle of a source from upload through chunked-and-embedded.
 *
 * - `uploaded`:    object in R2, no parsing started
 * - `parsing`:     worker is extracting text from PDF/DOCX
 * - `embedding`:   text is chunked, embeddings being generated
 * - `ready`:       all chunks have embeddings, retrievable by search
 * - `failed`:      parse or embed step errored out (see error_message)
 */
export const sourceStatusEnum = pgEnum("brand_bible_source_status", [
  "uploaded",
  "parsing",
  "embedding",
  "ready",
  "failed",
]);

export const sourceKindEnum = pgEnum("brand_bible_source_kind", [
  "paste", //  pasted text block
  "pdf", //    application/pdf
  "docx", //   application/vnd.openxmlformats-officedocument.wordprocessingml.document
  "url", //    fetched URL contents (Sprint 5)
]);

export const brandBibleSources = pgTable(
  "brand_bible_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    kind: sourceKindEnum("kind").notNull(),
    status: sourceStatusEnum("status").notNull().default("uploaded"),

    /** R2 object key — null for `kind = 'paste'`. */
    r2Key: text("r2_key"),
    /** Bytes for uploaded files, char-count for paste. */
    sizeBytes: integer("size_bytes"),

    /** Cached extracted plaintext (so we can re-chunk without re-parsing). */
    rawText: text("raw_text"),

    /** Total chunk count for this source. Filled in by the worker. */
    chunkCount: integer("chunk_count").notNull().default(0),

    /** Error message from the worker, surfaced in the UI. */
    errorMessage: text("error_message"),

    /** Free-form metadata: original filename, MIME, page count, etc. */
    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("brand_bible_sources_tenant_idx").on(t.tenantId, t.createdAt),
    index("brand_bible_sources_status_idx").on(t.tenantId, t.status),
  ],
);

export const brandBibleChunks = pgTable(
  "brand_bible_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    sourceId: uuid("source_id")
      .notNull()
      .references(() => brandBibleSources.id, { onDelete: "cascade" }),

    /** Ordinal within the source — 0-indexed. */
    chunkIndex: integer("chunk_index").notNull(),

    /** The actual text. Worker injects a "## {source title}\n" header. */
    content: text("content").notNull(),

    /** OpenAI's tiktoken count for the content, populated by the worker. */
    tokenCount: integer("token_count").notNull(),

    /** text-embedding-3-small produces 1536-dim vectors. */
    embedding: vector("embedding", 1536).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("brand_bible_chunks_tenant_idx").on(t.tenantId),
    index("brand_bible_chunks_source_idx").on(t.sourceId, t.chunkIndex),
    // HNSW index for cosine distance is created in raw SQL inside the
    // migration — Drizzle Kit doesn't render vector index opclasses yet.
  ],
);

export type BrandBibleSource = typeof brandBibleSources.$inferSelect;
export type NewBrandBibleSource = typeof brandBibleSources.$inferInsert;
export type BrandBibleChunk = typeof brandBibleChunks.$inferSelect;
export type NewBrandBibleChunk = typeof brandBibleChunks.$inferInsert;
