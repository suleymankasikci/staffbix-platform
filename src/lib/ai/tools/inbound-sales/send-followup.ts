import { and, eq } from "drizzle-orm";
import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { leads, workerActions } from "@/lib/db/schema";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * send_followup_email — draft + (depending on autonomy) queue a
 * nurture email to a prospect who didn't qualify for an immediate
 * meeting.
 *
 * Autonomy semantics, consistent with the Approval Center:
 *   - auto    → worker_action.status='auto', dispatched immediately by
 *               the BullMQ approval-dispatch worker (Sprint 7+ wiring).
 *   - approve → worker_action.status='pending', the owner sees it in
 *               the approvals inbox and clicks Approve.
 *   - suggest → tool refuses; model must reply to the prospect with
 *               the draft text inline so the human can manually send.
 *
 * The body is whatever the model produced — qualification context
 * (score, breakdown) goes into worker_action.payload so an operator
 * can audit "why did the AI send THIS to THIS prospect".
 */

export const sendFollowupEmailTool: Tool = {
  name: "send_followup_email",
  description:
    "Draft a nurture / follow-up email to a prospect who is interesting but didn't qualify for an immediate meeting (low budget, long timeline, or no decision-maker confirmation). Use this AFTER qualify_lead when the recommended next step is 'send_followup_email'. The body should be specific to what the prospect mentioned — no generic templates.",
  parameters: {
    type: "object",
    properties: {
      toEmail: { type: "string", description: "Prospect email — must match a lead row." },
      subject: { type: "string", description: "Email subject. Keep it under 70 chars." },
      body: {
        type: "string",
        description:
          "Email body. Plain text, 3-5 short paragraphs max. Lead with one specific detail they shared, not a generic intro.",
      },
      cadence: {
        type: "string",
        description:
          "Where this fits in the nurture sequence — 'first_touch' (first reply after qualify), 'follow_up_1' (3 days later), 'follow_up_2' (1 week later), or 'last_touch' (final attempt before marking dormant).",
        enum: ["first_touch", "follow_up_1", "follow_up_2", "last_touch"],
      },
    },
    required: ["toEmail", "subject", "body", "cadence"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const toEmail = String(args.toEmail).trim().toLowerCase();
    const subject = String(args.subject).trim();
    const body = String(args.body).trim();
    const cadence = String(args.cadence);

    if (!toEmail.includes("@")) return { ok: false, refused: true, reason: "toEmail malformed." };
    if (subject.length === 0 || subject.length > 200)
      return { ok: false, refused: true, reason: "subject must be 1-200 chars." };
    if (body.length < 30)
      return { ok: false, refused: true, reason: "body too short (need ≥30 chars)." };

    if (ctx.autonomy === "suggest") {
      return {
        ok: false,
        refused: true,
        reason:
          "Worker is in 'suggest' mode — include the draft email in your reply instead of executing. The owner will send it manually.",
      };
    }

    /* ── find lead → conversation linkage ───────────────────── */
    const [lead] = await db
      .select({ id: leads.id, metadata: leads.metadata })
      .from(leads)
      .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.email, toEmail)))
      .limit(1);

    if (!lead) {
      return {
        ok: false,
        refused: true,
        reason: "No matching lead row — call qualify_lead first.",
      };
    }

    /* ── worker_action ─────────────────────────────────────── */
    const status: "pending" | "auto" = ctx.autonomy === "auto" ? "auto" : "pending";
    try {
      const [actionRow] = await db
        .insert(workerActions)
        .values({
          tenantId: ctx.tenantId,
          workerId: ctx.workerId,
          conversationId: ctx.conversationId,
          kind: "email_send",
          status,
          content: body,
          payload: {
            to: toEmail,
            subject,
            cadence,
            leadId: lead.id,
            qualificationContext: lead.metadata,
            queuedByTool: "send_followup_email",
            workerAutonomy: ctx.autonomy,
          },
        })
        .returning({ id: workerActions.id });

      // Touch the lead so admin UI shows "last contacted" correctly
      // even if the actual email goes out a few hours later.
      const existingMeta = (lead.metadata as Record<string, unknown>) ?? {};
      const touches = Array.isArray(existingMeta.followupTouches)
        ? (existingMeta.followupTouches as unknown[])
        : [];
      touches.push({
        cadence,
        subject,
        actionId: actionRow.id,
        status,
        queuedAt: new Date().toISOString(),
      });
      await db
        .update(leads)
        .set({
          lastContactedAt: new Date(),
          metadata: { ...existingMeta, followupTouches: touches },
          updatedAt: new Date(),
        })
        .where(eq(leads.id, lead.id));

      await logSecurityEvent({
        kind: "lead.followup.queued",
        tenantId: ctx.tenantId,
        payload: {
          subject: "lead.followup.queued",
          leadId: lead.id,
          actionId: actionRow.id,
          toEmail,
          subjectLine: subject,
          cadence,
          autonomy: ctx.autonomy,
        },
      });

      return {
        ok: true,
        data: {
          queued: true,
          actionId: actionRow.id,
          status,
          cadence,
          willSend: status === "auto" ? "immediately" : "after owner approval",
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't queue the email: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
