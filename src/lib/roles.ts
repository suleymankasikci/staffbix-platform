/**
 * Client-safe types + constants for the role catalog. The actual data
 * lives in the `role_catalog` table — see `lib/roles-server.ts` for the
 * server-side loader, and `/api/admin/catalog-roles` for CRUD.
 *
 * Why split: `lib/roles.ts` is imported by client components (the
 * admin catalog page, WorkforceCatalog), so it MUST NOT pull in the
 * Drizzle client. Server components that need the catalog import
 * `loadCatalogRoles()` from `roles-server.ts`.
 */

export type RoleStatus = "available" | "q3";

export type Role = {
  slug: string;
  category: string;
  title: string;
  summary: string;
  channels: string[];
  status: RoleStatus;
};

export const CATEGORIES = [
  "All",
  "Customer-facing",
  "Sales",
  "Marketing",
  "Operations",
  "Finance",
  "Leadership",
] as const;

export type Category = (typeof CATEGORIES)[number];
