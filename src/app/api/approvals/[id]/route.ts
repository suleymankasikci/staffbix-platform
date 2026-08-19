import { type NextRequest, NextResponse } from "next/server";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import {
  approveAction,
  rejectAction,
  dispatchAction,
} from "@/lib/approvals/runtime";
import { readJson } from "@/lib/auth/request";
import { approvalDispatchQueue } from "@/lib/queue/queues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

interface PatchBody {
  decision?: "approve" | "reject";
  notes?: string;
}

const ID_RE = /^[0-9a-f-]{36}$/;

/**
 * PATCH /api/approvals/[id]
 *
 * Body: `{ decision: "approve" | "reject", notes? }`.
 * Auth: Owner/Admin only.
 *
 * On approve: row flips to status='approved' and is immediately
 * dispatched (web_reply is a no-op side-effect that marks status=sent).
 * Sprint 7+: dispatch goes through BullMQ when external API calls
 * (WhatsApp/email) are introduced.
 */
export async function PATCH(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "Owner" && session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "PATCH /api/approvals/[id]",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!ID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await readJson<PatchBody>(req);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  if (body.decision !== "approve" && body.decision !== "reject") {
    return NextResponse.json(
      { error: "decision must be 'approve' or 'reject'" },
      { status: 400 },
    );
  }
  const notes =
    typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : undefined;

  if (body.decision === "approve") {
    const approved = await approveAction({
      tenantId: session.tenantId,
      actionId: id,
      decidedBy: session.userId,
      notes,
    });
    if (!approved) {
      return NextResponse.json(
        { error: "Not found or no longer pending" },
        { status: 404 },
      );
    }
    // web_reply has no external API call → dispatch inline so the UI
    // can show the customer-visible reply immediately.
    // Other kinds (whatsapp_reply, email_send, social_post) hit a slow
    // upstream and go through the BullMQ approval-dispatch worker.
    if (approved.kind === "web_reply") {
      const dispatched = await dispatchAction(approved.id);
      return NextResponse.json({ ok: true, action: dispatched ?? approved });
    } else {
      await approvalDispatchQueue.add(`dispatch:${approved.id}`, {
        actionId: approved.id,
        tenantId: session.tenantId,
      });
      // The row stays at status='approved' until the worker flips it to
      // 'sent' or 'failed'. The UI polls /api/approvals to see progress.
      return NextResponse.json({ ok: true, action: approved, queued: true });
    }
  } else {
    const rejected = await rejectAction({
      tenantId: session.tenantId,
      actionId: id,
      decidedBy: session.userId,
      notes,
    });
    if (!rejected) {
      return NextResponse.json(
        { error: "Not found or no longer pending" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, action: rejected });
  }
}
