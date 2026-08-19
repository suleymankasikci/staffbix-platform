import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, tenants } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { csvRow } from "@/lib/admin-routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users/export
 *
 * Stream every user as CSV. Mirrors the column set of the GET listing
 * endpoint so the export is a faithful download of what staff sees on
 * /admin/users. 5000-row cap matches the listing route.
 *
 * The response is delivered as a single chunk — at 5000 rows this fits
 * comfortably in memory. A streaming variant lands when we cross 50k.
 */
export async function GET(): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "GET /api/admin/users/export",
  });
  if (t) return t;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      tenantName: tenants.name,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(tenants, eq(tenants.id, users.tenantId))
    .orderBy(desc(users.createdAt))
    .limit(5000);

  const header = csvRow([
    "id",
    "email",
    "name",
    "role",
    "tenantName",
    "status",
    "createdAt",
  ]);
  const body = rows
    .map((r) =>
      csvRow([
        r.id,
        r.email,
        r.name,
        r.role,
        r.tenantName,
        r.status,
        r.createdAt.toISOString(),
      ]),
    )
    .join("\n");

  const csv = `${header}\n${body}\n`;
  const today = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="staffbix-users-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
