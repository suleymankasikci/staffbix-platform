import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { securityEvents, tenants, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { csvRow } from "@/lib/admin-routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/audit/export
 *
 * CSV dump of the last 500 security events — same window as the GET
 * listing endpoint. `payload` is JSON-stringified into a single cell so
 * the export is grep-friendly without losing detail.
 *
 * Sprint 12 will expand the listing endpoint's cap; the export will
 * track whatever the listing does to stay consistent.
 */
export async function GET(): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "GET /api/admin/audit/export",
  });
  if (t) return t;

  const rows = await db
    .select({
      createdAt: securityEvents.createdAt,
      kind: securityEvents.kind,
      tenantName: tenants.name,
      userName: users.name,
      ip: securityEvents.ip,
      payload: securityEvents.payload,
    })
    .from(securityEvents)
    .leftJoin(tenants, eq(tenants.id, securityEvents.tenantId))
    .leftJoin(users, eq(users.id, securityEvents.userId))
    .orderBy(desc(securityEvents.createdAt))
    .limit(500);

  const header = csvRow([
    "createdAt",
    "kind",
    "tenantName",
    "userName",
    "ip",
    "payload",
  ]);
  const body = rows
    .map((r) =>
      csvRow([
        r.createdAt.toISOString(),
        r.kind,
        r.tenantName ?? "",
        r.userName ?? "",
        r.ip ?? "",
        r.payload === null ? "" : JSON.stringify(r.payload),
      ]),
    )
    .join("\n");

  const csv = `${header}\n${body}\n`;
  const today = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="staffbix-audit-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
