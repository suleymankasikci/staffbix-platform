import { sql } from "drizzle-orm";

/**
 * SQL snippets executed by the first migration. Drizzle generates the
 * `CREATE EXTENSION` lines from this constant when we add it to the
 * 0001 migration's manual SQL block.
 *
 * See docs/05-Infrastructure-Choices.md §2.1 — these four extensions are
 * the only ones we ship in MVP.
 */
export const REQUIRED_EXTENSIONS = [
  "pgcrypto", //   per-tenant encryption of integration secrets
  "pg_trgm", //    fuzzy search across users/tickets
  "unaccent", //   diacritic-insensitive search for Turkish/Spanish/etc.
  "vector", //     pgvector for Brand Bible embeddings
] as const;

export const createExtensionsSQL = sql.raw(
  REQUIRED_EXTENSIONS.map((e) => `CREATE EXTENSION IF NOT EXISTS "${e}";`).join("\n"),
);
