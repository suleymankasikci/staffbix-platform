import { NextResponse } from "next/server";
import { loadCatalogRoles } from "@/lib/roles-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public read-only catalog endpoint. The customer-facing
 * `/app/workforce/hire` page and the marketing-site Workforce catalog
 * both call this on mount. Admin CRUD lives in `/api/admin/catalog-roles`
 * (admin-only).
 *
 * No auth — the catalog is the marketing surface. Cached at the CDN
 * level by Next's default behavior for force-dynamic + JSON responses.
 */
export async function GET(): Promise<NextResponse> {
  const roles = await loadCatalogRoles();
  return NextResponse.json(
    { roles },
    {
      headers: {
        // Hint downstream caches: catalog is low-churn, OK to share.
        "Cache-Control": "public, max-age=60, s-maxage=120",
      },
    },
  );
}
