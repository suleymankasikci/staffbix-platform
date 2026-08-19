import { type NextRequest, NextResponse } from "next/server";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { getClientIp, getUserAgent } from "@/lib/auth/request";
import { logSecurityEvent } from "@/lib/audit/log";
import { revokeInvitation } from "@/lib/auth/invitations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/invitations/[id]
 *
 * Revokes a pending invitation. Idempotent: if the invite was already
 * revoked or accepted, returns ok=false but 200 (so a double-tap on
 * the UI doesn't surface an error).
 */
export async function DELETE(req: NextRequest, ctx: RouteCtx): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "Owner" && session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "DELETE /api/invitations/[id]",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "Invalid invitation id." }, { status: 400 });
  }

  const ok = await revokeInvitation({
    tenantId: session.tenantId,
    invitationId: id,
  });

  if (ok) {
    await logSecurityEvent({
      kind: "tenant.invitation.revoked",
      tenantId: session.tenantId,
      userId: session.userId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: { invitationId: id },
    });
  }

  return NextResponse.json({ ok });
}
