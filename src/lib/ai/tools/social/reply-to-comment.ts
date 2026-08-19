import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { workerActions } from "@/lib/db/schema";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * reply_to_social_comment — queue a reply to a comment on a social
 * platform (IG, X/Twitter, Facebook, LinkedIn) for the operator's
 * accounts wired through `integrations`.
 *
 * The actual delivery happens via the BullMQ approval-dispatch worker
 * (Sprint 7 wiring) — this tool just creates the `worker_actions` row
 * in the right status, autonomy-aware:
 *
 *   auto    → status='auto', dispatcher publishes immediately
 *   approve → status='pending', owner reviews in Approval Center
 *   suggest → refuse — model inlines the proposed reply in chat
 *
 * Volume + tone rules:
 *   - Reply length ≤ 350 chars (platform algorithms penalize long
 *     reply threads; the model should be punchy)
 *   - Profanity / personal-attack guardrails enforced by the system
 *     prompt; this tool doesn't second-guess them at code level
 *     (sanity check at the boundary is the model's job, not the
 *     queue's).
 */

const PLATFORMS = ["instagram", "twitter", "facebook", "linkedin"] as const;
const MAX_REPLY_CHARS = 350;

export const replyToSocialCommentTool: Tool = {
  name: "reply_to_social_comment",
  description:
    "Queue a reply to an INBOUND social-media comment. Pass the platform, the external comment id from the inbound webhook, and your draft reply body. Refuses in 'suggest' mode (model should inline the reply in conversation).",
  parameters: {
    type: "object",
    properties: {
      platform: {
        type: "string",
        description: "Which social platform the comment lives on.",
        enum: PLATFORMS,
      },
      externalCommentId: {
        type: "string",
        description:
          "The platform-native id of the comment you're replying to. Sourced from the inbound webhook payload.",
      },
      postReference: {
        type: "string",
        description:
          "Identifier for the post the comment is on — for the operator's audit, not the API call.",
      },
      body: {
        type: "string",
        description: "Reply text. ≤350 characters. Punchy + on-brand.",
      },
    },
    required: ["platform", "externalCommentId", "postReference", "body"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const platform = String(args.platform);
    const externalCommentId = String(args.externalCommentId).trim();
    const postReference = String(args.postReference).trim();
    const body = String(args.body).trim();

    if (!(PLATFORMS as readonly string[]).includes(platform)) {
      return { ok: false, refused: true, reason: `platform must be one of: ${PLATFORMS.join(", ")}` };
    }
    if (!externalCommentId) {
      return { ok: false, refused: true, reason: "externalCommentId is required." };
    }
    if (body.length === 0) {
      return { ok: false, refused: true, reason: "body cannot be empty." };
    }
    if (body.length > MAX_REPLY_CHARS) {
      return {
        ok: false,
        refused: true,
        reason: `body too long (${body.length} > ${MAX_REPLY_CHARS} chars). Shorten it.`,
      };
    }
    if (ctx.autonomy === "suggest") {
      return {
        ok: false,
        refused: true,
        reason:
          "Worker is in 'suggest' mode — inline the reply in your chat response instead of queueing. The owner will post it manually.",
      };
    }

    const status: "pending" | "auto" = ctx.autonomy === "auto" ? "auto" : "pending";

    try {
      const [row] = await db
        .insert(workerActions)
        .values({
          tenantId: ctx.tenantId,
          workerId: ctx.workerId,
          conversationId: ctx.conversationId,
          kind: "social_post",
          status,
          content: body,
          payload: {
            platform,
            externalCommentId,
            postReference,
            replyType: "comment_reply",
            queuedByTool: "reply_to_social_comment",
            autonomy: ctx.autonomy,
          },
        })
        .returning({ id: workerActions.id });

      await logSecurityEvent({
        kind: "social.reply.queued",
        tenantId: ctx.tenantId,
        payload: {
          subject: "social.reply.queued",
          actionId: row.id,
          platform,
          externalCommentId,
          autonomy: ctx.autonomy,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          actionId: row.id,
          status,
          platform,
          willPost: status === "auto" ? "immediately" : "after owner approval",
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't queue reply: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
