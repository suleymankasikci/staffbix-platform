import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { roleCatalog } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { readJson } from "@/lib/auth/request";
import { logSecurityEvent } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ slug: string }>;
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;
const CATEGORIES = [
  "Customer-facing",
  "Sales",
  "Marketing",
  "Operations",
  "Finance",
  "Leadership",
] as const;
const STATUSES = ["available", "q3"] as const;
type Category = (typeof CATEGORIES)[number];
type Status = (typeof STATUSES)[number];

interface UpdateBody {
  title?: string;
  category?: string;
  summary?: string;
  channels?: string[];
  status?: string;
  sortOrder?: string;
}

/**
 * GET    /api/admin/catalog-roles/[slug]  detail
 * PATCH  /api/admin/catalog-roles/[slug]  edit (admin)
 * DELETE /api/admin/catalog-roles/[slug]  delete (admin)
 *
 * Slug is the natural key. Mutations log to the security ledger via the
 * `catalog.role.updated` / `catalog.role.deleted` kinds.
 */
export async function GET(_req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }
  const [row] = await db
    .select()
    .from(roleCatalog)
    .where(eq(roleCatalog.slug, slug))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    role: {
      slug: row.slug,
      title: row.title,
      category: row.category,
      summary: row.summary,
      channels: row.channels,
      status: row.status,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "PATCH /api/admin/catalog-roles/[slug]",
  });
  if (t) return t;

  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const body = await readJson<UpdateBody>(req);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const [current] = await db
    .select()
    .from(roleCatalog)
    .where(eq(roleCatalog.slug, slug))
    .limit(1);
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string") {
    const v = body.title.trim();
    if (v.length < 2 || v.length > 120) {
      return NextResponse.json(
        { error: "title must be 2-120 chars" },
        { status: 400 },
      );
    }
    patch.title = v;
  }
  if (typeof body.category === "string") {
    if (!(CATEGORIES as readonly string[]).includes(body.category)) {
      return NextResponse.json(
        { error: `category must be one of: ${CATEGORIES.join(", ")}` },
        { status: 400 },
      );
    }
    patch.category = body.category as Category;
  }
  if (typeof body.summary === "string") {
    const v = body.summary.trim();
    if (v.length < 10 || v.length > 400) {
      return NextResponse.json(
        { error: "summary must be 10-400 chars" },
        { status: 400 },
      );
    }
    patch.summary = v;
  }
  if (Array.isArray(body.channels)) {
    patch.channels = body.channels
      .filter((c) => typeof c === "string" && c.length > 0)
      .slice(0, 30);
  }
  if (typeof body.status === "string") {
    if (!(STATUSES as readonly string[]).includes(body.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${STATUSES.join(", ")}` },
        { status: 400 },
      );
    }
    patch.status = body.status as Status;
  }
  if (typeof body.sortOrder === "string" && body.sortOrder.trim()) {
    patch.sortOrder = body.sortOrder.trim().slice(0, 20);
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, unchanged: true });
  }
  patch.updatedAt = new Date();

  await db.update(roleCatalog).set(patch).where(eq(roleCatalog.slug, slug));

  await logSecurityEvent({
    kind: "catalog.role.updated",
    tenantId: null,
    userId: session.user.id,
    payload: {
      subject: "catalog.role.updated",
      slug,
      fieldsChanged: Object.keys(patch).filter((k) => k !== "updatedAt"),
      actorUserId: session.user.id,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "DELETE /api/admin/catalog-roles/[slug]",
  });
  if (t) return t;

  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const [current] = await db
    .select({ slug: roleCatalog.slug, title: roleCatalog.title })
    .from(roleCatalog)
    .where(eq(roleCatalog.slug, slug))
    .limit(1);
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(roleCatalog).where(eq(roleCatalog.slug, slug));

  await logSecurityEvent({
    kind: "catalog.role.deleted",
    tenantId: null,
    userId: session.user.id,
    payload: {
      subject: "catalog.role.deleted",
      slug,
      title: current.title,
      actorUserId: session.user.id,
    },
  });

  return NextResponse.json({ ok: true });
}
