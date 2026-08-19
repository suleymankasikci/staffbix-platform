import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { workerActions } from "@/lib/db/schema";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * welcome_new_member — queue a personalized welcome message for a new
 * community member (Discord / Slack / Discourse / Circle / Reddit).
 *
 * Personalization signal:
 *   The model passes a short "context" string captured from the new
 *   member's join event (bio, intro post, referrer) so the welcome
 *   isn't generic. The model is encouraged to:
 *     - Reference one specific thing about them
 *     - Point them to the right channel for their interest
 *     - NOT pitch — community is not sales
 *
 * Worker_action kind reuses `social_post` (same publish-to-platform
 * semantics; dispatcher routes by payload.platform). Sprint 28+ adds
 * a dedicated `community_message` kind if community-specific routing
 * diverges.
 */

const COMMUNITY_PLATFORMS = ["discord", "slack", "discourse", "circle", "reddit"] as const;
const MAX_WELCOME_CHARS = 600;

export const welcomeNewMemberTool: Tool = {
  name: "welcome_new_member",
  description:
    "Queue a personalized welcome message for a new community member. NEVER use a generic template — reference one specific thing they mentioned. NEVER pitch the product; community is not sales. Refuses in 'suggest' mode (model drafts inline instead).",
  parameters: {
    type: "object",
    properties: {
      platform: {
        type: "string",
        enum: COMMUNITY_PLATFORMS,
        description: "Which community platform they joined.",
      },
      memberHandle: {
        type: "string",
        description: "Their platform handle / username (e.g. '@jane', 'jane#1234').",
      },
      memberName: {
        type: "string",
        description: "Their display name if different from handle.",
      },
      welcomeBody: {
        type: "string",
        description:
          "The personalized welcome message text. ≤600 chars. Reference one specific thing they shared on join.",
      },
      pointToChannel: {
        type: "string",
        description:
          "The channel / thread you're directing them to (e.g. '#beginners', '#help'). Optional — omit if not directing.",
      },
    },
    required: ["platform", "memberHandle", "welcomeBody"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const platform = String(args.platform);
    const memberHandle = String(args.memberHandle).trim();
    const memberName = args.memberName ? String(args.memberName).trim() : null;
    const welcomeBody = String(args.welcomeBody).trim();
    const pointToChannel = args.pointToChannel ? String(args.pointToChannel).trim() : null;

    if (!(COMMUNITY_PLATFORMS as readonly string[]).includes(platform)) {
      return { ok: false, refused: true, reason: `platform must be one of: ${COMMUNITY_PLATFORMS.join(", ")}` };
    }
    if (!memberHandle) {
      return { ok: false, refused: true, reason: "memberHandle is required." };
    }
    if (welcomeBody.length < 20) {
      return { ok: false, refused: true, reason: "welcomeBody too short — at least 20 chars." };
    }
    if (welcomeBody.length > MAX_WELCOME_CHARS) {
      return {
        ok: false,
        refused: true,
        reason: `welcomeBody too long (${welcomeBody.length} > ${MAX_WELCOME_CHARS}). Shorten.`,
      };
    }
    if (ctx.autonomy === "suggest") {
      return {
        ok: false,
        refused: true,
        reason:
          "Worker is in 'suggest' mode — inline the welcome message in your reply instead of queueing. The owner posts it manually.",
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
          content: welcomeBody,
          payload: {
            platform,
            memberHandle,
            memberName,
            pointToChannel,
            replyType: "community_welcome",
            queuedByTool: "welcome_new_member",
            autonomy: ctx.autonomy,
          },
        })
        .returning({ id: workerActions.id });

      await logSecurityEvent({
        kind: "community.member.welcomed",
        tenantId: ctx.tenantId,
        payload: {
          subject: "community.member.welcomed",
          actionId: row.id,
          platform,
          memberHandle,
          memberName,
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
          willSend: status === "auto" ? "immediately" : "after owner approval",
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't queue welcome: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
