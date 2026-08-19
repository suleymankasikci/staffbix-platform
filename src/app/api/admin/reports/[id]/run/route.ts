import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { reports, reportRuns, type ReportKind } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
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
 * POST /api/admin/reports/[id]/run
 *
 * Run any report — tenant-scoped or platform-scoped — regardless of
 * ownership. Mirrors the tenant-side endpoint but with admin auth and
 * no tenant-ownership filter.
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "POST /api/admin/reports/[id]/run",
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
    .where(eq(reports.id, id))
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
      tenantId: report.tenantId,
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
        scope: "admin",
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
      tenantId: report.tenantId,
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
        scope: "admin",
      },
    });

    console.error("[admin.reports.run] failed", err);
    return NextResponse.json(
      { error: "Report run failed.", message: message.slice(0, 500) },
      { status: 500 },
    );
  }
}
