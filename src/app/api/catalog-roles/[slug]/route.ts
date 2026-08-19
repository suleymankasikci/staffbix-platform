import { NextResponse, type NextRequest } from "next/server";
import { loadCatalogRole } from "@/lib/roles-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ slug: string }>;
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;

/**
 * Public read-only role lookup. Admin CRUD is in
 * `/api/admin/catalog-roles/[slug]`. This endpoint is open so the
 * customer-facing hire form and the marketing workforce page can fetch
 * a role without an authenticated session.
 */
export async function GET(_req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }
  const role = await loadCatalogRole(slug);
  if (!role) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(
    { role },
    {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=120" },
    },
  );
}
