import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { securityEvents, tenants, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/audit — last 500 security_events across all tenants,
 * left-joined with the tenant + user that triggered them.
 *
 * Both join columns are nullable on the source row (events can occur
 * without a tenant context — e.g. unauthenticated login attempts —
 * and the FK is `ON DELETE SET NULL`), so we use LEFT joins.
 *
 * 500 is the working budget for in-memory filtering on the page. The
 * Sprint 12 redesign moves filters server-side and lifts this cap.
 */
export async function GET(): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "GET /api/admin/audit",
  });
  if (t) return t;

  const rows = await db
    .select({
      id: securityEvents.id,
      kind: securityEvents.kind,
      createdAt: securityEvents.createdAt,
      ip: securityEvents.ip,
      userAgent: securityEvents.userAgent,
      tenantId: securityEvents.tenantId,
      tenantName: tenants.name,
      userId: securityEvents.userId,
      userName: users.name,
      payload: securityEvents.payload,
    })
    .from(securityEvents)
    .leftJoin(tenants, eq(tenants.id, securityEvents.tenantId))
    .leftJoin(users, eq(users.id, securityEvents.userId))
    .orderBy(desc(securityEvents.createdAt))
    .limit(500);

  return NextResponse.json({
    events: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      createdAt: r.createdAt.toISOString(),
      ip: r.ip,
      userAgent: r.userAgent,
      tenantId: r.tenantId,
      tenantName: r.tenantName,
      userId: r.userId,
      userName: r.userName,
      payload: r.payload,
    })),
  });
}
