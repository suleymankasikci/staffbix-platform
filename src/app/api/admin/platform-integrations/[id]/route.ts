import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { platformIntegrations } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { readJson } from "@/lib/auth/request";
import { logSecurityEvent } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

const ID_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;
const STATUSES = ["Live", "Degraded", "Disabled"] as const;
type Status = (typeof STATUSES)[number];

interface UpdateBody {
  status?: string;
  hint?: string;
  tenantsInstalled?: number;
}

/**
 * PATCH /api/admin/platform-integrations/[id]
 *
 * Update health label / hint for a platform integration. Admin only.
 * Audits every change via the `platform_integration.updated` kind.
 */
export async function PATCH(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "PATCH /api/admin/platform-integrations/[id]",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await readJson<UpdateBody>(req);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const [current] = await db
    .select()
    .from(platformIntegrations)
    .where(eq(platformIntegrations.id, id))
    .limit(1);
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.status === "string") {
    if (!(STATUSES as readonly string[]).includes(body.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${STATUSES.join(", ")}` },
        { status: 400 },
      );
    }
    patch.status = body.status as Status;
  }
  if (typeof body.hint === "string") {
    patch.hint = body.hint.slice(0, 200);
  }
  if (
    typeof body.tenantsInstalled === "number" &&
    Number.isFinite(body.tenantsInstalled) &&
    body.tenantsInstalled >= 0
  ) {
    patch.tenantsInstalled = Math.round(body.tenantsInstalled);
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, unchanged: true });
  }
  patch.updatedAt = new Date();

  await db
    .update(platformIntegrations)
    .set(patch)
    .where(eq(platformIntegrations.id, id));

  await logSecurityEvent({
    kind: "platform_integration.updated",
    tenantId: null,
    userId: session.user.id,
    payload: {
      subject: "platform_integration.updated",
      integrationId: id,
      fieldsChanged: Object.keys(patch).filter((k) => k !== "updatedAt"),
      actorUserId: session.user.id,
    },
  });

  return NextResponse.json({ ok: true });
}
