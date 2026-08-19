import { type NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { seoAudits } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { readJson } from "@/lib/auth/request";
import { runSeoAudit } from "@/lib/seo/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Body {
  url?: string;
  workerId?: string;
}

/**
 * GET /api/seo-audits — recent audits, no fetched_html in the list view.
 */
export async function GET(): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "GET /api/seo-audits",
  });
  if (t) return t;
  const rows = await db
    .select({
      id: seoAudits.id,
      url: seoAudits.url,
      status: seoAudits.status,
      fetchStatus: seoAudits.fetchStatus,
      result: seoAudits.result,
      errorMessage: seoAudits.errorMessage,
      createdAt: seoAudits.createdAt,
      updatedAt: seoAudits.updatedAt,
    })
    .from(seoAudits)
    .where(eq(seoAudits.tenantId, session.tenantId))
    .orderBy(desc(seoAudits.createdAt))
    .limit(100);
  return NextResponse.json({ audits: rows });
}

/**
 * POST /api/seo-audits — start a new audit synchronously.
 *
 * Body: `{ url, workerId? }`.
 * Auth: Owner/Admin/Editor.
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
    route: "POST /api/seo-audits",
  });
  if (t) return t;

  const body = await readJson<Body>(req);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!/^https?:\/\/[^\s/]+/.test(url)) {
    return NextResponse.json(
      { error: "url must be an http(s) URL" },
      { status: 400 },
    );
  }

  const [row] = await db
    .insert(seoAudits)
    .values({
      tenantId: session.tenantId,
      workerId: typeof body.workerId === "string" ? body.workerId : null,
      createdByUserId: session.userId,
      url,
      status: "fetching",
    })
    .returning();

  try {
    const result = await runSeoAudit({
      auditId: row.id,
      tenantId: session.tenantId,
    });
    return NextResponse.json({ ok: true, auditId: row.id, result });
  } catch (e) {
    console.error("[seo-audits] run failed:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Audit failed",
        auditId: row.id,
      },
      { status: 500 },
    );
  }
}
