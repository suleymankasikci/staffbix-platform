import { type NextRequest, NextResponse } from "next/server";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import {
  loadWorker,
  updateWorker,
  deleteWorker,
} from "@/lib/workers/runtime";
import { loadWorkerForUi } from "@/lib/workers/list";
import { readJson } from "@/lib/auth/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

interface PatchBody {
  name?: string;
  customInstructions?: string | null;
  channels?: string[];
  autonomy?: "auto" | "approve" | "suggest";
  settings?: Record<string, unknown>;
  modelPin?: string | null;
  status?: "active" | "paused" | "terminated";
}

const ID_RE = /^[0-9a-f-]{36}$/;

export async function GET(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t1 = await rateLimitOr429("chat", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "GET /api/workers/[id]",
  });
  if (t1) return t1;
  const { id } = await ctx.params;
  if (!ID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const shape = new URL(req.url).searchParams.get("shape");
  if (shape === "ui") {
    const worker = await loadWorkerForUi({ tenantId: session.tenantId, workerId: id });
    if (!worker) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ worker });
  }

  const worker = await loadWorker({ tenantId: session.tenantId, workerId: id });
  if (!worker) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ worker });
}

export async function PATCH(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "Owner" && session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const t1 = await rateLimitOr429("chat", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "PATCH /api/workers/[id]",
  });
  if (t1) return t1;

  const { id } = await ctx.params;
  if (!ID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await readJson<PatchBody>(req);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  // Whitelist patch fields — never trust arbitrary keys into the row.
  const patch: Parameters<typeof updateWorker>[0]["patch"] = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (body.customInstructions !== undefined) {
    patch.customInstructions =
      body.customInstructions === null
        ? null
        : String(body.customInstructions).trim() || null;
  }
  if (Array.isArray(body.channels)) {
    patch.channels = body.channels.filter((c): c is string => typeof c === "string");
  }
  if (body.autonomy && ["auto", "approve", "suggest"].includes(body.autonomy)) {
    patch.autonomy = body.autonomy;
  }
  if (body.settings && typeof body.settings === "object") {
    patch.settings = body.settings;
  }
  if (body.modelPin !== undefined) {
    patch.modelPin = body.modelPin === null ? null : String(body.modelPin);
  }
  if (body.status && ["active", "paused", "terminated"].includes(body.status)) {
    patch.status = body.status;
  }

  const worker = await updateWorker({
    tenantId: session.tenantId,
    workerId: id,
    patch,
  });
  if (!worker) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, worker });
}

export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "Owner" && session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const t1 = await rateLimitOr429("chat", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "DELETE /api/workers/[id]",
  });
  if (t1) return t1;

  const { id } = await ctx.params;
  if (!ID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const ok = await deleteWorker({ tenantId: session.tenantId, workerId: id });
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
