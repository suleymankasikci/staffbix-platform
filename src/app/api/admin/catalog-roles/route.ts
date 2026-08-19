import { type NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { roleCatalog } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { readJson } from "@/lib/auth/request";
import { logSecurityEvent } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

interface CreateBody {
  slug?: string;
  title?: string;
  category?: string;
  summary?: string;
  channels?: string[];
  status?: string;
  sortOrder?: string;
}

/**
 * GET /api/admin/catalog-roles — full catalog. Admin-only.
 * POST /api/admin/catalog-roles — create a new role. Admin-only.
 *
 * The catalog is small (under 100 rows even in our growth scenario) so
 * pagination is unnecessary. Customer-facing pages also read this list
 * (via the same handler today; can be split into a public read endpoint
 * later if we need ETag / public caching).
 */
export async function GET(): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "GET /api/admin/catalog-roles",
  });
  if (t) return t;

  const rows = await db
    .select()
    .from(roleCatalog)
    .orderBy(asc(roleCatalog.sortOrder), asc(roleCatalog.slug));

  return NextResponse.json({
    roles: rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      category: r.category,
      summary: r.summary,
      channels: r.channels,
      status: r.status,
      sortOrder: r.sortOrder,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "POST /api/admin/catalog-roles",
  });
  if (t) return t;

  const body = await readJson<CreateBody>(req);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const category = typeof body.category === "string" ? body.category : "";
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  const channels = Array.isArray(body.channels)
    ? body.channels.filter((c) => typeof c === "string" && c.length > 0).slice(0, 30)
    : [];
  const status =
    typeof body.status === "string" && (STATUSES as readonly string[]).includes(body.status)
      ? (body.status as Status)
      : "available";
  const sortOrder =
    typeof body.sortOrder === "string" && body.sortOrder.trim()
      ? body.sortOrder.trim().slice(0, 20)
      : "999";

  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: "slug must be 2-63 lowercase chars, digits, or hyphens." },
      { status: 400 },
    );
  }
  if (title.length < 2 || title.length > 120) {
    return NextResponse.json(
      { error: "title required (2-120 chars)." },
      { status: 400 },
    );
  }
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json(
      { error: `category must be one of: ${CATEGORIES.join(", ")}` },
      { status: 400 },
    );
  }
  if (summary.length < 10 || summary.length > 400) {
    return NextResponse.json(
      { error: "summary required (10-400 chars)." },
      { status: 400 },
    );
  }

  try {
    const [row] = await db
      .insert(roleCatalog)
      .values({
        slug,
        title,
        category: category as Category,
        summary,
        channels,
        status,
        sortOrder,
      })
      .returning({ slug: roleCatalog.slug });

    await logSecurityEvent({
      kind: "catalog.role.created",
      tenantId: null,
      userId: session.user.id,
      payload: {
        subject: "catalog.role.created",
        slug: row.slug,
        title,
        category,
        actorUserId: session.user.id,
      },
    });

    return NextResponse.json({ ok: true, slug: row.slug }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("duplicate key")) {
      return NextResponse.json(
        { error: `slug ${slug} already exists.` },
        { status: 409 },
      );
    }
    console.error("[catalog-roles.post] failed", err);
    return NextResponse.json(
      { error: "Could not create role." },
      { status: 500 },
    );
  }
}
