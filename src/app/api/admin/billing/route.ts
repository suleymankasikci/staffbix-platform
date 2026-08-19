import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { platformInvoices, tenants } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/billing — every platform invoice across every tenant,
 * shaped for the admin/billing page (mirrors PLATFORM_INVOICES type).
 *
 * Status mapping: our enum (paid/past_due/failed/refunded/...) →
 * the admin UI's labels (Paid / Past due / Failed / Refunded).
 */

function mapStatus(s: string): "Paid" | "Past due" | "Failed" | "Refunded" {
  if (s === "paid") return "Paid";
  if (s === "past_due") return "Past due";
  if (s === "failed") return "Failed";
  if (s === "refunded") return "Refunded";
  // draft / open / void → show as Past due in the admin until we expand
  // the UI's enum coverage. Most of these don't surface in the panel anyway.
  return "Past due";
}

export async function GET(): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "GET /api/admin/billing",
  });
  if (t) return t;

  const rows = await db
    .select({
      id: platformInvoices.id,
      stripeInvoiceId: platformInvoices.stripeInvoiceId,
      tenantId: platformInvoices.tenantId,
      tenantName: tenants.name,
      planId: platformInvoices.planId,
      amountCents: platformInvoices.amountCents,
      currency: platformInvoices.currency,
      status: platformInvoices.status,
      hostedInvoiceUrl: platformInvoices.hostedInvoiceUrl,
      pdfUrl: platformInvoices.pdfUrl,
      issuedAt: platformInvoices.issuedAt,
      paidAt: platformInvoices.paidAt,
      createdAt: platformInvoices.createdAt,
    })
    .from(platformInvoices)
    .innerJoin(tenants, eq(tenants.id, platformInvoices.tenantId))
    .orderBy(desc(platformInvoices.issuedAt))
    .limit(1000);

  const invoices = rows.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    tenantName: r.tenantName,
    plan: r.planId.charAt(0).toUpperCase() + r.planId.slice(1),
    amount: r.amountCents / 100,
    currency: r.currency,
    status: mapStatus(r.status),
    issuedAt: r.issuedAt?.toISOString().slice(0, 10) ?? null,
    paidAt: r.paidAt?.toISOString().slice(0, 10) ?? null,
    hostedInvoiceUrl: r.hostedInvoiceUrl,
    pdfUrl: r.pdfUrl,
    stripeInvoiceId: r.stripeInvoiceId,
  }));

  return NextResponse.json({ invoices });
}
