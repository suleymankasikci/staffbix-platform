import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { supportTickets } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tickets — recent support tickets for the caller's tenant.
 * Includes the linked conversation id so the UI can deep-link to the
 * full message history.
 */
export async function GET(): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "GET /api/tickets",
  });
  if (t) return t;
  const rows = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.tenantId, session.tenantId))
    .orderBy(desc(supportTickets.updatedAt))
    .limit(200);
  return NextResponse.json({ tickets: rows });
}
