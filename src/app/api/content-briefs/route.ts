import { type NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contentBriefs, workers } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { readJson } from "@/lib/auth/request";
import { produceContentForBrief } from "@/lib/content/produce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // generating N variants × M channels can take a while

interface Body {
  workerId?: string;
  title?: string;
  briefText?: string;
  targetChannels?: string[];
  variantsPerChannel?: number;
  parameters?: Record<string, unknown>;
}

const ID_RE = /^[0-9a-f-]{36}$/;
const VALID_CHANNELS = new Set([
  "twitter",
  "linkedin",
  "instagram",
  "facebook",
  "threads",
  "blog",
]);

/**
 * GET /api/content-briefs — recent briefs (with status + action ids) for
 * the caller's tenant.
 */
export async function GET(): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "GET /api/content-briefs",
  });
  if (t) return t;
  const rows = await db
    .select()
    .from(contentBriefs)
    .where(eq(contentBriefs.tenantId, session.tenantId))
    .orderBy(desc(contentBriefs.createdAt))
    .limit(100);
  return NextResponse.json({ briefs: rows });
}

/**
 * POST /api/content-briefs — create a brief and run the production
 * pipeline synchronously.
 *
 * Auth: Owner/Admin/Editor (Reviewer is read-only).
 *
 * The pipeline is synchronous for MVP because the demo expectation is
 * "click 'Brief' and see the drafts in the Approval Center within a
 * few seconds". For batch / scheduled briefs (Sprint 11+) we'll move
 * this to BullMQ.
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
    route: "POST /api/content-briefs",
  });
  if (t) return t;

  const body = await readJson<Body>(req);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const workerId = typeof body.workerId === "string" ? body.workerId : "";
  if (!ID_RE.test(workerId)) {
    return NextResponse.json({ error: "workerId is required" }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 200) {
    return NextResponse.json({ error: "title is required (max 200 chars)" }, { status: 400 });
  }
  const briefText = typeof body.briefText === "string" ? body.briefText.trim() : "";
  if (!briefText) {
    return NextResponse.json({ error: "briefText is required" }, { status: 400 });
  }
  if (briefText.length > 8_000) {
    return NextResponse.json({ error: "briefText too long (max 8000 chars)" }, { status: 400 });
  }
  const channels = Array.isArray(body.targetChannels)
    ? body.targetChannels
        .filter((c): c is string => typeof c === "string")
        .map((c) => c.toLowerCase())
        .filter((c) => VALID_CHANNELS.has(c))
    : [];
  if (channels.length === 0) {
    return NextResponse.json(
      { error: `targetChannels must include at least one of: ${[...VALID_CHANNELS].join(", ")}` },
      { status: 400 },
    );
  }
  const variantsPerChannel =
    typeof body.variantsPerChannel === "number" && body.variantsPerChannel >= 1
      ? Math.min(10, Math.floor(body.variantsPerChannel))
      : 1;

  // Verify the worker belongs to this tenant.
  const [worker] = await db
    .select()
    .from(workers)
    .where(and(eq(workers.id, workerId), eq(workers.tenantId, session.tenantId)))
    .limit(1);
  if (!worker) return NextResponse.json({ error: "Worker not found" }, { status: 404 });
  if (worker.status !== "active") {
    return NextResponse.json({ error: "Worker is not active" }, { status: 409 });
  }

  const [brief] = await db
    .insert(contentBriefs)
    .values({
      tenantId: session.tenantId,
      workerId,
      createdByUserId: session.userId,
      title,
      briefText,
      targetChannels: channels,
      variantsPerChannel,
      parameters: body.parameters ?? {},
      status: "drafting",
    })
    .returning();

  try {
    const result = await produceContentForBrief({
      briefId: brief.id,
      tenantId: session.tenantId,
    });
    return NextResponse.json({
      ok: true,
      brief: result.brief,
      actionIds: result.actionIds,
    });
  } catch (e) {
    console.error("[content-briefs] produce failed:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Production failed",
        briefId: brief.id,
      },
      { status: 500 },
    );
  }
}
