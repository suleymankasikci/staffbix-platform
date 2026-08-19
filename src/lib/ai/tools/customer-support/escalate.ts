import { eq } from "drizzle-orm";
import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { conversations } from "@/lib/db/schema";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * escalate_to_human — flip the conversation into `awaiting_human` and
 * stop the AI from sending further automated replies in that thread.
 *
 * Use cases (encoded in the description so the model knows when to
 * call it):
 *   - Customer is visibly angry / threatening
 *   - Question requires a refund / discount / commitment OUTSIDE the
 *     worker's authority
 *   - Detected harm (self-harm, harm to others, abusive content)
 *   - GDPR / privacy request (must be human-reviewed for legal reasons)
 *   - Anything where the safest answer is "I'll get a teammate"
 *
 * Effect:
 *   1. `conversations.status` → 'awaiting_human'
 *   2. Audit row written so the owner can see why escalation happened
 *      in the activity feed
 *   3. (Sprint 22) Slack / Expo push to the on-call human via the
 *      existing approvals/dispatch worker
 *
 * After this fires, dispatchInbound (the inbound message router) sees
 * `status='awaiting_human'` and SKIPS calling chatReply — the customer's
 * next message is queued for the human, not the AI.
 */

const ESCALATION_KINDS = [
  "angry_customer",
  "outside_authority",
  "harm_or_safety",
  "gdpr_or_privacy",
  "complex_billing",
  "other",
] as const;

export const escalateTool: Tool = {
  name: "escalate_to_human",
  description:
    "Hand the conversation off to a human teammate. Call this when the customer is angry, when the request is outside your authority (large refund, custom discount, contract change), when there's a safety concern, or when you simply don't have the data to answer confidently. AFTER calling this, your reply should be brief: tell the customer a teammate will follow up, don't speculate.",
  parameters: {
    type: "object",
    properties: {
      kind: {
        type: "string",
        description: "Why are you escalating?",
        enum: ESCALATION_KINDS,
      },
      summary: {
        type: "string",
        description:
          "1-2 sentence handoff note for the human teammate. Mention the customer's actual ask and what you tried.",
      },
    },
    required: ["kind", "summary"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const kind = String(args.kind);
    const summary = String(args.summary).trim();

    if (!ESCALATION_KINDS.includes(kind as (typeof ESCALATION_KINDS)[number])) {
      return {
        ok: false,
        refused: true,
        reason: `kind must be one of: ${ESCALATION_KINDS.join(", ")}`,
      };
    }
    if (!summary || summary.length < 5) {
      return {
        ok: false,
        refused: true,
        reason: "summary is too short — give the human at least a sentence of context.",
      };
    }

    try {
      const rows = await db
        .update(conversations)
        .set({
          status: "awaiting_human",
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, ctx.conversationId))
        .returning({ id: conversations.id });

      if (rows.length === 0) {
        return {
          ok: false,
          refused: true,
          reason: "Conversation not found — can't escalate.",
        };
      }

      await logSecurityEvent({
        kind: "conversation.escalated",
        tenantId: ctx.tenantId,
        payload: {
          subject: "conversation.escalated",
          conversationId: ctx.conversationId,
          workerId: ctx.workerId,
          channel: ctx.channel,
          escalationKind: kind,
          summary: summary.slice(0, 400),
        },
      });

      return {
        ok: true,
        data: {
          escalated: true,
          conversationStatus: "awaiting_human",
          handoffKind: kind,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't update conversation: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
