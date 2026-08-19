import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq, isNotNull } from "drizzle-orm";
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sprint 16 — tenant-side reports CRUD.
 *
 * GET  /api/reports            list reports owned by the caller's tenant
 * POST /api/reports            create a new tenant-scoped report
 *
 * Admin reports (tenant_id IS NULL) live in /api/admin/reports and are
 * never returned here even to Owners — the in-app reports page is
 * intentionally siloed from platform analytics.
 *
 * Audit kind is `report.created` (Sprint 17 enum,
 * drizzle/0013_sprint17.sql).
 */

interface CreateBody {
  name?: string;
  kind?: string;
  config?: Record<string, unknown>;
  schedule?: string | null;
}

export async function GET(): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "GET /api/reports",
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
      .where(
        and(eq(reports.tenantId, session.tenantId), isNotNull(reports.tenantId)),
      )
      .orderBy(desc(reports.createdAt))
      .limit(200);

    // Fetch last run per report — single query, in-memory pick the latest.
    const ids = rows.map((r) => r.id);
    let lastRunByReport: Map<string, {
      id: string;
      status: string;
      startedAt: Date;
      finishedAt: Date | null;
      durationMs: number | null;
      rowCount: number | null;
      error: string | null;
    }> = new Map();
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
        .limit(500);
      lastRunByReport = new Map();
      for (const run of runs) {
        if (!ids.includes(run.reportId)) continue;
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
    console.error("[reports.get] failed", err);
    return NextResponse.json(
      { error: "Could not load reports." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "POST /api/reports",
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
    !TENANT_REPORT_KINDS.has(body.kind as ReportKind)
  ) {
    return NextResponse.json(
      {
        error:
          "kind must be one of: workforce_volume, ai_spend_daily, approvals_throughput",
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
        tenantId: session.tenantId,
        name,
        kind: body.kind as ReportKind,
        config,
        schedule,
        createdBy: session.user.id,
      })
      .returning({ id: reports.id });

    await logSecurityEvent({
      kind: "report.created",
      tenantId: session.tenantId,
      userId: session.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        subject: "report.created",
        reportId: row!.id,
        kind: body.kind,
        scope: "tenant",
      },
    });

    return NextResponse.json({ ok: true, id: row!.id }, { status: 201 });
  } catch (err) {
    console.error("[reports.post] failed", err);
    return NextResponse.json(
      { error: "Could not create report." },
      { status: 500 },
    );
  }
}
