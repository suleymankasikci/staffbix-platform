import { NextResponse } from "next/server";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { listPending } from "@/lib/approvals/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/approvals — pending worker_actions for the caller's tenant.
 *
 * Used by the Approval Center inbox UI. Includes the draft text and
 * the conversation/worker linkage so the UI can render context.
 */
export async function GET(): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "GET /api/approvals",
  });
  if (t) return t;
  const rows = await listPending(session.tenantId);
  return NextResponse.json({ approvals: rows });
}
