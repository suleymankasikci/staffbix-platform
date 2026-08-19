import { type NextRequest, NextResponse } from "next/server";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { getClientIp, getUserAgent } from "@/lib/auth/request";
import { loadCatalogRole } from "@/lib/roles-server";
import { logSecurityEvent } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ slug: string }>;
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;

/**
 * POST /api/catalog-roles/[slug]/notify
 *
 * Records that the signed-in operator wants to be notified when a
 * roadmap (status = "q3") role becomes available. Interest is written
 * to the security-events ledger under `catalog.role.interest` so the
 * team can gauge demand per role. Idempotency is intentionally NOT
 * enforced — repeated taps are cheap ledger rows and demand signal.
 *
 * Refuses for roles that are already available (nothing to wait for)
 * or unknown slugs.
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "POST /api/catalog-roles/[slug]/notify",
  });
  if (t) return t;

  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const role = await loadCatalogRole(slug);
  if (!role) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (role.status !== "q3") {
    return NextResponse.json(
      { error: "This role is already available — hire it directly." },
      { status: 409 },
    );
  }

  await logSecurityEvent({
    kind: "catalog.role.interest",
    tenantId: session.tenantId,
    userId: session.user.id,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    payload: {
      subject: "catalog.role.interest",
      roleSlug: slug,
      roleTitle: role.title,
      actorUserId: session.user.id,
    },
  });

  return NextResponse.json({ ok: true });
}
