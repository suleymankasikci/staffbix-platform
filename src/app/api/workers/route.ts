import { type NextRequest, NextResponse } from "next/server";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import {
  hireWorker,
  listWorkers,
  WorkerError,
} from "@/lib/workers/runtime";
import { listWorkersForUi } from "@/lib/workers/list";
import { readJson } from "@/lib/auth/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HireBody {
  roleSlug?: string;
  name?: string;
  customInstructions?: string;
  channels?: string[];
  autonomy?: "auto" | "approve" | "suggest";
  settings?: Record<string, unknown>;
  modelPin?: string;
}

/**
 * GET /api/workers — list workers for the caller's tenant.
 *
 * `?shape=ui` returns the UI-enriched shape with rolling-7d aggregates
 * (messages, approvals, voice-match, status mapping). Default returns
 * the raw DB rows for programmatic callers.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t1 = await rateLimitOr429("chat", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "GET /api/workers",
  });
  if (t1) return t1;
  const shape = new URL(req.url).searchParams.get("shape");
  if (shape === "ui") {
    const workers = await listWorkersForUi({ tenantId: session.tenantId });
    return NextResponse.json({ workers });
  }
  const rows = await listWorkers(session.tenantId);
  return NextResponse.json({ workers: rows });
}

/**
 * POST /api/workers — hire a new worker.
 *
 * Auth: Owner/Admin only (Editor/Reviewer can browse but not hire).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "Owner" && session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const t1 = await rateLimitOr429("chat", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "POST /api/workers",
  });
  if (t1) return t1;

  const body = await readJson<HireBody>(req);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  if (typeof body.roleSlug !== "string" || !body.roleSlug) {
    return NextResponse.json({ error: "roleSlug is required" }, { status: 400 });
  }

  try {
    const worker = await hireWorker({
      tenantId: session.tenantId,
      roleSlug: body.roleSlug,
      name: body.name,
      customInstructions: body.customInstructions,
      channels: body.channels,
      autonomy: body.autonomy,
      settings: body.settings,
      modelPin: body.modelPin,
    });
    return NextResponse.json({ ok: true, worker });
  } catch (e) {
    if (e instanceof WorkerError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    console.error("[workers] hire failed:", e);
    return NextResponse.json({ error: "Hire failed. Please try again." }, { status: 500 });
  }
}
