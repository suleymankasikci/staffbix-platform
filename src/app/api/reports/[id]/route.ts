import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  reports,
  reportRuns,
  TENANT_REPORT_KINDS,
  type ReportKind,
} from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";
import { getClientIp, getUserAgent, readJson } from "@/lib/auth/request";
import { UUID_RE } from "@/lib/admin-routes";

interface UpdateBody {
  name?: string;
  kind?: string;
  config?: Record<string, unknown>;
  schedule?: string | null;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * GET    /api/reports/[id]   detail + last 20 runs
 * PATCH  /api/reports/[id]   update name / kind / config / schedule
 * DELETE /api/reports/[id]   hard delete (cascades to runs)
 *
 * All three enforce tenant ownership — a report owned by another tenant
 * returns 404 to avoid leaking existence.
 */
export async function GET(_req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "GET /api/reports/[id]",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
  }

  try {
    const [row] = await db
      .select()
      .from(reports)
      .where(and(eq(reports.id, id), eq(reports.tenantId, session.tenantId)))
      .limit(1);
    if (!row) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const runs = await db
      .select({
        id: reportRuns.id,
        status: reportRuns.status,
        startedAt: reportRuns.startedAt,
        finishedAt: reportRuns.finishedAt,
        durationMs: reportRuns.durationMs,
        rowCount: reportRuns.rowCount,
        error: reportRuns.error,
        data: reportRuns.data,
      })
      .from(reportRuns)
      .where(eq(reportRuns.reportId, id))
      .orderBy(desc(reportRuns.startedAt))
      .limit(20);

    return NextResponse.json({
      report: {
        id: row.id,
        name: row.name,
        kind: row.kind,
        config: row.config,
        schedule: row.schedule,
        createdBy: row.createdBy,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
      runs: runs.map((r) => ({
        id: r.id,
        status: r.status,
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt?.toISOString() ?? null,
        durationMs: r.durationMs,
        rowCount: r.rowCount,
        error: r.error,
        data: r.data,
      })),
    });
  } catch (err) {
    console.error("[reports.id.get] failed", err);
    return NextResponse.json(
      { error: "Could not load report." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "PATCH /api/reports/[id]",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
  }

  const body = await readJson<UpdateBody>(req);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const [current] = await db
      .select({
        id: reports.id,
        name: reports.name,
        kind: reports.kind,
        config: reports.config,
        schedule: reports.schedule,
      })
      .from(reports)
      .where(and(eq(reports.id, id), eq(reports.tenantId, session.tenantId)))
      .limit(1);
    if (!current) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};
    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name || name.length > 200) {
        return NextResponse.json(
          { error: "name is required (max 200 chars)" },
          { status: 400 },
        );
      }
      patch.name = name;
    }
    if (typeof body.kind === "string") {
      if (!TENANT_REPORT_KINDS.has(body.kind as ReportKind)) {
        return NextResponse.json(
          {
            error:
              "kind must be one of: workforce_volume, ai_spend_daily, approvals_throughput",
          },
          { status: 400 },
        );
      }
      patch.kind = body.kind as ReportKind;
    }
    if (
      body.config &&
      typeof body.config === "object" &&
      !Array.isArray(body.config)
    ) {
      patch.config = body.config;
    }
    if (body.schedule === null) {
      patch.schedule = null;
    } else if (
      typeof body.schedule === "string" &&
      body.schedule.trim().length > 0
    ) {
      patch.schedule = body.schedule.trim().slice(0, 200);
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: true, unchanged: true });
    }
    patch.updatedAt = new Date();

    await db.update(reports).set(patch).where(eq(reports.id, id));

    await logSecurityEvent({
      kind: "report.updated",
      tenantId: session.tenantId,
      userId: session.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        subject: "report.updated",
        reportId: id,
        fieldsChanged: Object.keys(patch).filter((k) => k !== "updatedAt"),
        scope: "tenant",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reports.id.patch] failed", err);
    return NextResponse.json(
      { error: "Could not update report." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "DELETE /api/reports/[id]",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
  }

  try {
    const [current] = await db
      .select({
        id: reports.id,
        name: reports.name,
        kind: reports.kind,
      })
      .from(reports)
      .where(and(eq(reports.id, id), eq(reports.tenantId, session.tenantId)))
      .limit(1);
    if (!current) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    await db.delete(reports).where(eq(reports.id, id));

    await logSecurityEvent({
      kind: "report.deleted",
      tenantId: session.tenantId,
      userId: session.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        subject: "report.deleted",
        reportId: id,
        name: current.name,
        kind: current.kind,
        scope: "tenant",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reports.id.delete] failed", err);
    return NextResponse.json(
      { error: "Could not delete report." },
      { status: 500 },
    );
  }
}
