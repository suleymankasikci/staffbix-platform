import { NextResponse, type NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  reports,
  reportRuns,
  ADMIN_REPORT_KINDS,
  type ReportKind,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";
import { getClientIp, getUserAgent, readJson } from "@/lib/auth/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sprint 16 — admin / platform reports CRUD.
 *
 * GET  /api/admin/reports   ALL reports across all tenants + platform.
 *                           Returned list is a single firehose for the
 *                           staff console; filtering happens client-side.
 * POST /api/admin/reports   Create a platform-level report. `tenantId`
 *                           is always NULL — admin must use the
 *                           tenant-side endpoint to create per-tenant
 *                           reports on a tenant's behalf (impersonation
 *                           is a Sprint 18 feature).
 */

interface CreateBody {
  name?: string;
  kind?: string;
  config?: Record<string, unknown>;
  schedule?: string | null;
}

export async function GET(): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "GET /api/admin/reports",
  });
  if (t) return t;

  try {
    const rows = await db
      .select({
        id: reports.id,
        tenantId: reports.tenantId,
        name: reports.name,
        kind: reports.kind,
        config: reports.config,
        schedule: reports.schedule,
        createdBy: reports.createdBy,
        createdAt: reports.createdAt,
        updatedAt: reports.updatedAt,
      })
      .from(reports)
      .orderBy(desc(reports.createdAt))
      .limit(500);

    const ids = rows.map((r) => r.id);
    const lastRunByReport = new Map<
      string,
      {
        id: string;
        status: string;
        startedAt: Date;
        finishedAt: Date | null;
        durationMs: number | null;
        rowCount: number | null;
        error: string | null;
      }
    >();
    if (ids.length > 0) {
      const runs = await db
        .select({
          id: reportRuns.id,
          reportId: reportRuns.reportId,
          status: reportRuns.status,
          startedAt: reportRuns.startedAt,
          finishedAt: reportRuns.finishedAt,
          durationMs: reportRuns.durationMs,
          rowCount: reportRuns.rowCount,
          error: reportRuns.error,
        })
        .from(reportRuns)
        .orderBy(desc(reportRuns.startedAt))
        .limit(1000);
      for (const run of runs) {
        if (!lastRunByReport.has(run.reportId)) {
          lastRunByReport.set(run.reportId, {
            id: run.id,
            status: run.status,
            startedAt: run.startedAt,
            finishedAt: run.finishedAt,
            durationMs: run.durationMs,
            rowCount: run.rowCount,
            error: run.error,
          });
        }
      }
    }

    return NextResponse.json({
      reports: rows.map((r) => {
        const last = lastRunByReport.get(r.id);
        return {
          id: r.id,
          tenantId: r.tenantId,
          name: r.name,
          kind: r.kind,
          config: r.config,
          schedule: r.schedule,
          createdBy: r.createdBy,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          lastRun: last
            ? {
                id: last.id,
                status: last.status,
                startedAt: last.startedAt.toISOString(),
                finishedAt: last.finishedAt?.toISOString() ?? null,
                durationMs: last.durationMs,
                rowCount: last.rowCount,
                error: last.error,
              }
            : null,
        };
      }),
    });
  } catch (err) {
    console.error("[admin.reports.get] failed", err);
    return NextResponse.json(
      { error: "Could not load reports." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "POST /api/admin/reports",
  });
  if (t) return t;

  const body = await readJson<CreateBody>(req);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 200) {
    return NextResponse.json(
      { error: "name is required (max 200 chars)" },
      { status: 400 },
    );
  }
  if (
    typeof body.kind !== "string" ||
    !ADMIN_REPORT_KINDS.has(body.kind as ReportKind)
  ) {
    return NextResponse.json(
      {
        error: "kind must be one of: billing_summary, tenants_overview",
      },
      { status: 400 },
    );
  }
  const config =
    body.config && typeof body.config === "object" && !Array.isArray(body.config)
      ? (body.config as Record<string, unknown>)
      : {};
  const schedule =
    typeof body.schedule === "string" && body.schedule.trim().length > 0
      ? body.schedule.trim().slice(0, 200)
      : null;

  try {
    const [row] = await db
      .insert(reports)
      .values({
        tenantId: null,
        name,
        kind: body.kind as ReportKind,
        config,
        schedule,
        createdBy: session.user.id,
      })
      .returning({ id: reports.id });

    await logSecurityEvent({
      kind: "report.created",
      userId: session.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        subject: "report.created",
        reportId: row!.id,
        kind: body.kind,
        scope: "admin",
      },
    });

    return NextResponse.json({ ok: true, id: row!.id }, { status: 201 });
  } catch (err) {
    console.error("[admin.reports.post] failed", err);
    return NextResponse.json(
      { error: "Could not create report." },
      { status: 500 },
    );
  }
}
