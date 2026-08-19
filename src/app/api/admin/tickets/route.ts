import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { supportTickets, tenants } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/tickets — every support ticket across every tenant.
 * Staff-only.
 *
 * Shaped for the admin/support UI (SUPPORT_TICKETS in admin-data.ts):
 *   { id, subject, body, status, priority, channel, tenantId,
 *     reporterEmail, reporterName, assignedTo, createdAt, updatedAt }
 *
 * Sprint 12 adds pagination + filters; for now the panel can handle
 * the first 500 tickets in-memory.
 */

function mapStatus(s: string): "Open" | "Pending" | "Resolved" | "Closed" {
  if (s === "open") return "Open";
  if (s === "pending") return "Pending";
  if (s === "resolved") return "Resolved";
  return "Closed";
}

function mapPriority(p: string): "Critical" | "High" | "Normal" | "Low" {
  if (p === "critical") return "Critical";
  if (p === "high") return "High";
  if (p === "low") return "Low";
  return "Normal";
}

export async function GET(): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "GET /api/admin/tickets",
  });
  if (t) return t;

  const rows = await db
    .select({
      id: supportTickets.id,
      code: supportTickets.code,
      subject: supportTickets.subject,
      bodyPreview: supportTickets.bodyPreview,
      status: supportTickets.status,
      priority: supportTickets.priority,
      channel: supportTickets.channel,
      tenantId: supportTickets.tenantId,
      tenantName: tenants.name,
      reporterEmail: supportTickets.reporterEmail,
      reporterName: supportTickets.reporterName,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
    })
    .from(supportTickets)
    .innerJoin(tenants, eq(tenants.id, supportTickets.tenantId))
    .orderBy(desc(supportTickets.updatedAt))
    .limit(500);

  const tickets = rows.map((r) => ({
    id: r.id,
    code: r.code,
    subject: r.subject,
    body: r.bodyPreview,
    status: mapStatus(r.status),
    priority: mapPriority(r.priority),
    channel: r.channel,
    tenantId: r.tenantId,
    tenantName: r.tenantName,
    reporterEmail: r.reporterEmail,
    reporterName: r.reporterName ?? r.reporterEmail,
    assignedTo: null as string | null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return NextResponse.json({ tickets });
}
