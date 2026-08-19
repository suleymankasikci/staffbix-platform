import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tenants } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";
import { getClientIp, getUserAgent, readJson } from "@/lib/auth/request";
import { UUID_RE } from "@/lib/admin-routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/tenants/[id]/deprovision
 *
 * Soft deprovision — marks the tenant suspended and stamps the audit log
 * with `deprovision: true` and an `deprovisionedAt` timestamp. The body
 * MUST carry `{ confirm: true }`; anything else is a 400 to keep this
 * from being triggered by accident.
 *
 * Hard delete (data wipe) is intentionally NOT done here. A cron job +
 * 30-day retention window will perform the wipe — that lands in
 * Sprint 18. Until then this is reversible by flipping the tenant status
 * back to "active" through PATCH /api/admin/tenants/[id].
 *
 * (We do not have a `metadata` jsonb column on `tenants` today — the
 * deprovision marker lives in the audit log payload instead. Sprint 18
 * may add a denormalized column to make the wipe-eligible set easier to
 * query.)
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "POST /api/admin/tenants/[id]/deprovision",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
  }

  const body = await readJson<{ confirm?: unknown }>(req);
  if (!body || body.confirm !== true) {
    return NextResponse.json(
      { error: "confirm: true required" },
      { status: 400 },
    );
  }

  try {
    const [tenantRow] = await db
      .select({ id: tenants.id, name: tenants.name, status: tenants.status })
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);
    if (!tenantRow) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const deprovisionedAt = new Date();
    await db
      .update(tenants)
      .set({ status: "suspended", updatedAt: deprovisionedAt })
      .where(eq(tenants.id, id));

    await logSecurityEvent({
      kind: "tenant.suspended",
      tenantId: id,
      userId: session.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        tenantName: tenantRow.name,
        previousStatus: tenantRow.status,
        deprovision: true,
        deprovisionedAt: deprovisionedAt.toISOString(),
        // Hard delete + data wipe: Sprint 18 cron + 30-day retention.
        hardDeleteAt: new Date(
          deprovisionedAt.getTime() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin.tenants.deprovision] failed", err);
    return NextResponse.json(
      { error: "Could not deprovision tenant." },
      { status: 500 },
    );
  }
}
