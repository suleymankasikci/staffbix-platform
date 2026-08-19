import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { plans } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/plans — every row from the plans catalog.
 *
 * Low-churn table (Stripe price IDs change at most a few times a year),
 * so we return everything in one shot — no pagination, no filters.
 * Ordered by `sortOrder` so the panel renders Starter → Enterprise.
 */
export async function GET(): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "GET /api/admin/plans",
  });
  if (t) return t;

  const rows = await db
    .select()
    .from(plans)
    .orderBy(asc(plans.sortOrder));

  return NextResponse.json({
    plans: rows.map((p) => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      stripePriceId: p.stripePriceId,
      priceMonthlyCents: p.priceMonthlyCents,
      currency: p.currency,
      maxWorkers: p.maxWorkers,
      maxMonthlyAiDollars: p.maxMonthlyAiDollars,
      maxChannelsPerWorker: p.maxChannelsPerWorker,
      maxTeamSeats: p.maxTeamSeats,
      features: p.features,
      isPublic: p.isPublic,
      sortOrder: p.sortOrder,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
}
