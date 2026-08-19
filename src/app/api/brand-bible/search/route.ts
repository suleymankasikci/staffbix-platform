import { type NextRequest, NextResponse } from "next/server";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { searchBrandBible } from "@/lib/ai/retrieve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/brand-bible/search
 *
 * Body: `{ query, k? }`. Returns top-k Brand Bible chunks for the
 * caller's tenant.
 *
 * Used by:
 *   - The UI's preview-search box (so the customer can sanity-check
 *     what their workers will see for a given question).
 *   - The AI worker request path (Sprint 5) — internal callers will
 *     bypass this route and import `searchBrandBible` directly to
 *     avoid the HTTP hop.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "POST /api/brand-bible/search",
  });
  if (t) return t;

  type Body = { query?: string; k?: number };
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });
  if (query.length > 8_000) {
    return NextResponse.json({ error: "query too long (max 8000 chars)" }, { status: 400 });
  }

  const k = typeof body.k === "number" && body.k > 0 && body.k <= 50 ? body.k : 6;

  try {
    const hits = await searchBrandBible({
      tenantId: session.tenantId,
      query,
      k,
    });
    return NextResponse.json({ ok: true, hits });
  } catch (e) {
    console.error("[brand-bible/search] failed:", e);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
