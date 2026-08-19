import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { platformIntegrations } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/platform-integrations
 *
 * Returns the platform integration catalog (Anthropic, OpenAI, Stripe,
 * Resend, etc.) for the admin Integrations page. Per-tenant integration
 * connections live in a separate table — this is the metadata layer
 * where staff toggle status / refresh the health hint.
 */
export async function GET(): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "GET /api/admin/platform-integrations",
  });
  if (t) return t;

  const rows = await db
    .select()
    .from(platformIntegrations)
    .orderBy(asc(platformIntegrations.sortOrder), asc(platformIntegrations.id));

  return NextResponse.json({
    integrations: rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      status: r.status,
      hint: r.hint,
      tenantsInstalled: r.tenantsInstalled,
      sortOrder: r.sortOrder,
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
}
