import { type NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { readJson, normalizeEmail } from "@/lib/auth/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateBody {
  email?: string;
  name?: string;
  company?: string;
  title?: string;
  phone?: string;
  source?: string;
  notes?: string;
  tags?: string[];
}

/**
 * GET /api/leads — recent leads for the caller's tenant.
 */
export async function GET(): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "GET /api/leads",
  });
  if (t) return t;
  const rows = await db
    .select()
    .from(leads)
    .where(eq(leads.tenantId, session.tenantId))
    .orderBy(desc(leads.createdAt))
    .limit(500);
  return NextResponse.json({ leads: rows });
}

/**
 * POST /api/leads — create a single lead. Bulk CSV import lands in
 * Sprint 11.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "Reviewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "POST /api/leads",
  });
  if (t) return t;
  const body = await readJson<CreateBody>(req);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const email = normalizeEmail(body.email);
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : null;
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string").map((t) => t.slice(0, 40)).slice(0, 20)
    : [];

  try {
    const [row] = await db
      .insert(leads)
      .values({
        tenantId: session.tenantId,
        email,
        name,
        company: typeof body.company === "string" ? body.company.slice(0, 200) : null,
        title: typeof body.title === "string" ? body.title.slice(0, 200) : null,
        phone: typeof body.phone === "string" ? body.phone.slice(0, 50) : null,
        source: typeof body.source === "string" ? body.source.slice(0, 80) : null,
        notes: typeof body.notes === "string" ? body.notes.slice(0, 4_000) : null,
        tags,
      })
      .returning();
    return NextResponse.json({ ok: true, lead: row });
  } catch (e: unknown) {
    const err = e as { cause?: { code?: string; constraint_name?: string } };
    if (
      err.cause?.code === "23505" &&
      String(err.cause?.constraint_name ?? "").includes("leads_tenant_email_unique")
    ) {
      return NextResponse.json(
        { error: "A lead with this email already exists." },
        { status: 409 },
      );
    }
    console.error("[leads] create failed:", e);
    return NextResponse.json({ error: "Could not create lead" }, { status: 500 });
  }
}
