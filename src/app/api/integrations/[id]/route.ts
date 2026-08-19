import { type NextRequest, NextResponse } from "next/server";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { disconnectIntegration } from "@/lib/integrations/manage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

const ID_RE = /^[0-9a-f-]{36}$/;

/**
 * DELETE /api/integrations/[id]
 *
 * Soft-disconnect: status flips to 'disconnected', secret blob is kept
 * for the audit trail. Hard delete only via a separate operator-level
 * tool — keeping the row protects us from "we never had that integration"
 * disputes after a bad outage.
 *
 * Auth: Owner/Admin only.
 */
export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "Owner" && session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "DELETE /api/integrations/[id]",
  });
  if (t) return t;
  const { id } = await ctx.params;
  if (!ID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const ok = await disconnectIntegration({
    tenantId: session.tenantId,
    integrationId: id,
  });
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
