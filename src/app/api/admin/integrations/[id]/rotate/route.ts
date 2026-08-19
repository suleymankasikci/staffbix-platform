import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { integrations } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";
import { getClientIp, getUserAgent } from "@/lib/auth/request";
import { UUID_RE } from "@/lib/admin-routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/integrations/[id]/rotate
 *
 * Force-rotate an integration's credentials. We:
 *   1. zero out `secret_blob` (the column is NOT NULL, so we write an
 *      empty bytea — there is no valid AES-256-GCM payload at length 0,
 *      so any decrypt attempt fails closed),
 *   2. flip `status` to "disconnected" so the dispatcher stops using it,
 *   3. clear the lastVerifiedAt timestamp,
 *   4. stamp `lastError` with a human-readable note so the tenant UI
 *      shows the reason.
 *
 * The tenant Owner is expected to reconnect through their dashboard;
 * Sprint 15 will deliver the in-app prompt + notification.
 *
 * Audit kind is `integration.rotated` (Sprint 17 enum,
 * drizzle/0013_sprint17.sql).
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "POST /api/admin/integrations/[id]/rotate",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "Invalid integration id" },
      { status: 400 },
    );
  }

  try {
    const [row] = await db
      .select({
        id: integrations.id,
        tenantId: integrations.tenantId,
        kind: integrations.kind,
        displayName: integrations.displayName,
      })
      .from(integrations)
      .where(eq(integrations.id, id))
      .limit(1);
    if (!row) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 },
      );
    }

    await db
      .update(integrations)
      .set({
        secretBlob: new Uint8Array(0),
        status: "disconnected",
        lastVerifiedAt: null,
        lastError: "Credentials rotated by platform staff. Reconnect required.",
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, id));

    await logSecurityEvent({
      kind: "integration.rotated",
      tenantId: row.tenantId,
      userId: session.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        subject: "integration.rotated",
        integrationId: row.id,
        integrationKind: row.kind,
        displayName: row.displayName,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin.integrations.rotate] failed", err);
    return NextResponse.json(
      { error: "Could not rotate integration." },
      { status: 500 },
    );
  }
}
