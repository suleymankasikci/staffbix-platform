// Server-only by convention: this module imports the Drizzle DB client
// (`@/lib/db/client`), which never belongs in a client bundle. We do NOT
// use the `server-only` package here — Next aliases it at build, but it
// is unresolvable under plain `tsx` (used by the 80+ audit/ops scripts
// that import this transitively via workers/runtime), so importing it
// broke that tooling. The db-client import is its own hard guard.
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { roleCatalog } from "@/lib/db/schema";
import type { Role } from "./roles";

/**
 * Server-side loader for the role catalog. Reads from the
 * `role_catalog` table seeded in migration 0017. Sorted by the
 * `sort_order` column (legacy positional order from `lib/roles.ts` is
 * preserved by that seed).
 *
 * Used by every server component or API route that needs the catalog —
 * customer-facing Workforce > Hire pages, admin catalog list, the
 * worker-runtime when expanding a role into a worker config.
 */
export async function loadCatalogRoles(): Promise<Role[]> {
  const rows = await db
    .select()
    .from(roleCatalog)
    .orderBy(asc(roleCatalog.sortOrder), asc(roleCatalog.slug));
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    category: r.category,
    summary: r.summary,
    channels: r.channels,
    status: r.status,
  }));
}

/**
 * Single-row fetch by slug. Returns null when the slug is unknown so
 * callers can return a 404 cleanly.
 */
export async function loadCatalogRole(slug: string): Promise<Role | null> {
  const [row] = await db
    .select()
    .from(roleCatalog)
    .where(eq(roleCatalog.slug, slug))
    .limit(1);
  if (!row) return null;
  return {
    slug: row.slug,
    title: row.title,
    category: row.category,
    summary: row.summary,
    channels: row.channels,
    status: row.status,
  };
}
