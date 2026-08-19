import { type NextRequest, NextResponse } from "next/server";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { deleteBrandBibleSource } from "@/lib/brand-bible/ingest";
import { brandBibleIngestQueue } from "@/lib/queue/queues";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { brandBibleSources } from "@/lib/db/schema";
import { logSecurityEvent } from "@/lib/audit/log";
import { getClientIp, getUserAgent } from "@/lib/auth/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/brand-bible/[id]
 *
 * Removes a source, its R2 object (if any), and (via FK CASCADE) every
 * chunk. Audit-logged. Returns 404 if the source doesn't exist in the
 * caller's tenant — tenant isolation enforced inside the helper.
 */
export async function DELETE(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "DELETE /api/brand-bible/[id]",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  // Capture the title before deletion for a meaningful audit record.
  const [existing] = await db
    .select({ title: brandBibleSources.title })
    .from(brandBibleSources)
    .where(eq(brandBibleSources.id, id))
    .limit(1);

  const ok = await deleteBrandBibleSource({
    sourceId: id,
    tenantId: session.tenantId,
  });
  if (!ok) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await logSecurityEvent({
    kind: "brand_bible.source.deleted",
    tenantId: session.tenantId,
    userId: session.user.id,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    payload: {
      subject: "brand_bible.source.deleted",
      sourceId: id,
      title: existing?.title ?? null,
      actorUserId: session.user.id,
    },
  });

  return NextResponse.json({ ok: true });
}

/**
 * POST /api/brand-bible/[id]  (re-ingest)
 *
 * Re-enqueues an ingest job — used to recover from a `failed` state
 * after the worker bug is fixed.
 */
export async function POST(_req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "POST /api/brand-bible/[id]",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const [source] = await db
    .select()
    .from(brandBibleSources)
    .where(eq(brandBibleSources.id, id))
    .limit(1);
  if (!source || source.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Reset status so the worker doesn't see stale state.
  await db
    .update(brandBibleSources)
    .set({ status: "uploaded", errorMessage: null })
    .where(eq(brandBibleSources.id, id));

  await brandBibleIngestQueue.add(
    `ingest:${id}:${Date.now()}`,
    { sourceId: id, tenantId: session.tenantId },
  );

  return NextResponse.json({ ok: true });
}
