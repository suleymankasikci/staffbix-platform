import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * One Postgres pool per Node process. Railway gives us a connection-limit
 * budget; we keep this small (10) because the worker process opens its
 * own pool and we run multiple replicas.
 *
 * Important: do NOT import this file from edge runtimes — `postgres` is
 * a TCP client and requires Node. All app routes that hit the DB live in
 * the Node runtime, see `src/app/api/**` route handlers.
 */
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL && process.env.NODE_ENV !== "test") {
  throw new Error(
    "DATABASE_URL is required. Copy .env.example to .env.local and fill it in.",
  );
}

declare global {
  /**
   * Cached postgres-js client across module reloads in dev. Production
   * hits the assignment once and never reuses across processes.
   */
  var __staffbix_pg__: ReturnType<typeof postgres> | undefined;
}

const sql =
  globalThis.__staffbix_pg__ ??
  postgres(DATABASE_URL!, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false, // PgBouncer in transaction mode rejects PREPARE
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__staffbix_pg__ = sql;
}

export const db = drizzle(sql, { schema });
export type DB = typeof db;
export { schema };

/**
 * Helper that prepends a tenant scope to a query.
 *
 * Intended use:
 *   const rows = await withTenant(db, tenantId).query.users.findMany({
 *     where: (u, { eq }) => eq(u.email, "x@y.com"),
 *   });
 *
 * For Sprint 1 this is a thin wrapper that just returns the same db
 * handle, but downstream code is expected to import via this helper.
 * That way, when we move to RLS in Sprint 7, switching every call site
 * is a no-op — we change the body of `withTenant`, not its callers.
 */
export function withTenant(database: DB, tenantId: string): DB {
  if (!tenantId) {
    throw new Error("withTenant() called without a tenantId.");
  }
  return database;
}
