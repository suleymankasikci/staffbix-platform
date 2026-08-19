import { type NextRequest, NextResponse } from "next/server";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { readJson } from "@/lib/auth/request";
import { draftOutreachEmail, OutreachError } from "@/lib/sales/outreach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface Body {
  workerId?: string;
  leadId?: string;
  promptOverride?: string;
}

const ID_RE = /^[0-9a-f-]{36}$/;

/**
 * POST /api/sdr-outreach — draft an outreach email for a lead.
 *
 * Pipeline:
 *   1. Validate workerId + leadId belong to the caller's tenant
 *   2. Generate a draft via chatReply (Brand Bible grounded)
 *   3. Persist as an assistant message
 *   4. Create a worker_action(kind='email_send', payload includes to+subject)
 *   5. Flip lead.status='queued'
 *
 * Auth: Owner/Admin/Editor (Reviewer is read-only).
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
    route: "POST /api/sdr-outreach",
  });
  if (t) return t;
  const body = await readJson<Body>(req);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const workerId = typeof body.workerId === "string" ? body.workerId : "";
  const leadId = typeof body.leadId === "string" ? body.leadId : "";
  if (!ID_RE.test(workerId)) {
    return NextResponse.json({ error: "workerId is required" }, { status: 400 });
  }
  if (!ID_RE.test(leadId)) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }

  try {
    const result = await draftOutreachEmail({
      tenantId: session.tenantId,
      workerId,
      leadId,
      promptOverride: typeof body.promptOverride === "string" ? body.promptOverride : undefined,
    });
    return NextResponse.json({
      ok: true,
      actionId: result.actionId,
      subject: result.subject,
      conversationId: result.conversationId,
    });
  } catch (e) {
    if (e instanceof OutreachError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    console.error("[sdr-outreach] failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Outreach failed" },
      { status: 500 },
    );
  }
}
