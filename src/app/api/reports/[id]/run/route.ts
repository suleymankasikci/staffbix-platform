import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { reports, reportRuns, type ReportKind } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";
import { getClientIp, getUserAgent } from "@/lib/auth/request";
import { UUID_RE } from "@/lib/admin-routes";
import { runReport } from "@/lib/reports/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/reports/[id]/run
 *
 * Synchronously executes the report's underlying query and records the
 * result in `report_runs`. Errors land as status='failed' rows + a
 * `report.run.failed` audit event; success writes status='completed'
 * with the JSON data payload and emits `report.run.completed`.
 *
 * Sprint 19 will replace the synchronous path with a BullMQ job + a
 * GET endpoint that polls for the result; the row shape doesn't change.
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "POST /api/reports/[id]/run",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
  }

  const [report] = await db
    .select({
      id: reports.id,
      tenantId: reports.tenantId,
      kind: reports.kind,
      config: reports.config,
      name: reports.name,
    })
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.tenantId, session.tenantId)))
    .limit(1);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const [runRow] = await db
    .insert(reportRuns)
    .values({ reportId: id, status: "running" })
    .returning({ id: reportRuns.id });

  try {
    const result = await runReport({
      tenantId: report.tenantId,
      kind: report.kind as ReportKind,
      config: (report.config as Record<string, unknown>) ?? {},
    });

    await db
      .update(reportRuns)
      .set({
        status: "completed",
        finishedAt: new Date(),
        durationMs: result.durationMs,
        rowCount: result.rowCount,
        data: result.data,
        error: null,
      })
      .where(eq(reportRuns.id, runRow!.id));

    await logSecurityEvent({
      kind: "report.run.completed",
      tenantId: session.tenantId,
      userId: session.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        subject: "report.run.completed",
        reportId: id,
        runId: runRow!.id,
        kind: report.kind,
        durationMs: result.durationMs,
        rowCount: result.rowCount,
        scope: "tenant",
      },
    });

    return NextResponse.json({
      ok: true,
      run: {
        id: runRow!.id,
        status: "completed",
        durationMs: result.durationMs,
        rowCount: result.rowCount,
        data: result.data,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(reportRuns)
      .set({
        status: "failed",
        finishedAt: new Date(),
        error: message.slice(0, 4000),
      })
      .where(eq(reportRuns.id, runRow!.id));

    await logSecurityEvent({
      kind: "report.run.failed",
      tenantId: session.tenantId,
      userId: session.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        subject: "report.run.failed",
        reportId: id,
        runId: runRow!.id,
        kind: report.kind,
        error: message.slice(0, 500),
        scope: "tenant",
      },
    });

    console.error("[reports.run] failed", err);
    return NextResponse.json(
      { error: "Report run failed.", message: message.slice(0, 500) },
      { status: 500 },
    );
  }
}
