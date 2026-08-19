import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { platformInvoices, tenants } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { csvRow } from "@/lib/admin-routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/billing/export
 *
 * CSV dump of every platform invoice (capped to 1000 to match the
 * listing route). Column set mirrors what the /admin/billing UI shows
 * with the addition of `stripe_invoice_id` for cross-reference.
 */
export async function GET(): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "GET /api/admin/billing/export",
  });
  if (t) return t;

  const rows = await db
    .select({
      stripeInvoiceId: platformInvoices.stripeInvoiceId,
      tenantName: tenants.name,
      planId: platformInvoices.planId,
      amountCents: platformInvoices.amountCents,
      currency: platformInvoices.currency,
      status: platformInvoices.status,
      issuedAt: platformInvoices.issuedAt,
      paidAt: platformInvoices.paidAt,
    })
    .from(platformInvoices)
    .innerJoin(tenants, eq(tenants.id, platformInvoices.tenantId))
    .orderBy(desc(platformInvoices.issuedAt))
    .limit(1000);

  const header = csvRow([
    "stripe_invoice_id",
    "tenantName",
    "planId",
    "amountCents",
    "currency",
    "status",
    "issuedAt",
    "paidAt",
  ]);
  const body = rows
    .map((r) =>
      csvRow([
        r.stripeInvoiceId,
        r.tenantName,
        r.planId,
        r.amountCents,
        r.currency,
        r.status,
        r.issuedAt ? r.issuedAt.toISOString() : "",
        r.paidAt ? r.paidAt.toISOString() : "",
      ]),
    )
    .join("\n");

  const csv = `${header}\n${body}\n`;
  const today = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="staffbix-billing-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
