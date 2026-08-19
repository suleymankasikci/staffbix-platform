import { NextResponse } from "next/server";
import { desc, eq, count } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tenants, users, plans } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/tenants
 *
 * Returns every tenant on the platform, joined with their plan record
 * and a user count. Shaped to match the admin UI's existing `Tenant`
 * type (src/lib/admin-data.ts) so the page renders without a redesign.
 *
 * Auth: staff-only (admin session cookie + Owner role). Pagination is
 * client-side for now (≤ 1000 tenants will be the norm); when we cross
 * 5k tenants we'll switch this to keyset paging.
 */

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function mapStatus(s: string): "Active" | "Trial" | "Past due" | "Suspended" | "Churned" {
  switch (s) {
    case "trialing":
      return "Trial";
    case "active":
      return "Active";
    case "past_due":
      return "Past due";
    case "suspended":
      return "Suspended";
    case "canceled":
      return "Churned";
    default:
      return "Active";
  }
}

export async function GET(): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "GET /api/admin/tenants",
  });
  if (t) return t;

  // One query for the listing + one aggregate for user counts. The user
  // count could be a correlated subquery — fine for ≤ 1k tenants, we'll
  // optimize when it matters.
  const rows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      planId: tenants.planId,
      planName: plans.name,
      planPriceCents: plans.priceMonthlyCents,
      status: tenants.status,
      country: tenants.country,
      createdAt: tenants.createdAt,
      trialEndsAt: tenants.trialEndsAt,
    })
    .from(tenants)
    .innerJoin(plans, eq(plans.id, tenants.planId))
    .orderBy(desc(tenants.createdAt))
    .limit(1000);

  // User counts in one shot.
  const userCountRows = await db
    .select({ tenantId: users.tenantId, c: count(users.id) })
    .from(users)
    .groupBy(users.tenantId);
  const userCounts = new Map(userCountRows.map((r) => [r.tenantId, Number(r.c)]));

  // Owner email lookup — pick the first Owner per tenant. Cheap enough
  // for now; we'll denormalize onto tenants when this hurts.
  const ownerRows = await db
    .select({
      tenantId: users.tenantId,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(eq(users.role, "Owner"));
  const owners = new Map(ownerRows.map((r) => [r.tenantId, r]));

  const out = rows.map((r) => {
    const owner = owners.get(r.id);
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      initials: initialsOf(r.name),
      plan: r.planName,
      planId: r.planId,
      status: mapStatus(r.status),
      mrr: r.planPriceCents / 100,
      workersHired: 0, // Sprint 5: real count from workers table
      users: userCounts.get(r.id) ?? 0,
      signedUpAt: r.createdAt.toISOString().slice(0, 10),
      region: r.country ?? "—",
      ownerEmail: owner?.email ?? "—",
      ownerName: owner?.name ?? "—",
    };
  });

  return NextResponse.json({ tenants: out });
}
