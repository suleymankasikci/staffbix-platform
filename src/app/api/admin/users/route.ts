import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, tenants } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users — every user across every tenant, joined with
 * their tenant's name for display.
 *
 * Capped at 5000 rows for now — well above the working set we expect
 * for the first year. Sprint 12 introduces keyset pagination + filters
 * server-side when this starts hurting.
 */
export async function GET(): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "GET /api/admin/users",
  });
  if (t) return t;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      locale: users.locale,
      tenantId: users.tenantId,
      tenantName: tenants.name,
      createdAt: users.createdAt,
      lastSeenAt: users.lastLoginAt,
    })
    .from(users)
    .innerJoin(tenants, eq(tenants.id, users.tenantId))
    .orderBy(desc(users.createdAt))
    .limit(5000);

  return NextResponse.json({
    users: rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      locale: u.locale,
      tenantId: u.tenantId,
      tenantName: u.tenantName,
      createdAt: u.createdAt.toISOString(),
      lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
    })),
  });
}
