import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * flag_for_moderation — record a community thread / message that
 * needs HUMAN moderator review and never act unilaterally on it.
 *
 * Critical invariant: community managers MUST NOT ban / mute / delete
 * unilaterally. The role config says so explicitly ("Escalate
 * conflicts to me — never moderate without approval."). This tool
 * codifies that: it records the flag, surfaces it via security_event,
 * and lets the operator decide. The model is told to phrase its reply
 * to the community member as "I've flagged this for a teammate to
 * review", not "I've taken action".
 *
 * Severity scale informs operator triage:
 *   - low: code-of-conduct nudge needed, not urgent
 *   - medium: heated argument, needs intervention this week
 *   - high: harassment, doxxing, illegal content — immediate
 */

const SEVERITIES = ["low", "medium", "high"] as const;
const PLATFORMS = ["discord", "slack", "discourse", "circle", "reddit"] as const;

export const flagForModerationTool: Tool = {
  name: "flag_for_moderation",
  description:
    "Flag a community thread or message for HUMAN moderator review. Use this when you see harassment, off-topic spam, heated arguments, or any content that needs intervention. NEVER act on the message yourself — only flag.",
  parameters: {
    type: "object",
    properties: {
      platform: { type: "string", enum: PLATFORMS },
      messageReference: {
        type: "string",
        description:
          "Platform-native thread / message id, channel name, or permalink — whatever the moderator needs to find it.",
      },
      severity: { type: "string", enum: SEVERITIES },
      reason: {
        type: "string",
        description: "Why it needs review. Quote the problematic content briefly + your concern in 1-2 sentences.",
      },
    },
    required: ["platform", "messageReference", "severity", "reason"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const platform = String(args.platform);
    const messageReference = String(args.messageReference).trim();
    const severity = String(args.severity);
    const reason = String(args.reason).trim();

    if (!(PLATFORMS as readonly string[]).includes(platform)) {
      return { ok: false, refused: true, reason: `platform must be one of: ${PLATFORMS.join(", ")}` };
    }
    if (!(SEVERITIES as readonly string[]).includes(severity)) {
      return { ok: false, refused: true, reason: `severity must be one of: ${SEVERITIES.join(", ")}` };
    }
    if (messageReference.length === 0) {
      return { ok: false, refused: true, reason: "messageReference is required." };
    }
    if (reason.length < 15) {
      return {
        ok: false,
        refused: true,
        reason: "reason too short — moderators need context to act.",
      };
    }

    try {
      await logSecurityEvent({
        kind: "community.moderation.flagged",
        tenantId: ctx.tenantId,
        payload: {
          subject: "community.moderation.flagged",
          platform,
          messageReference,
          severity,
          reason,
          workerId: ctx.workerId,
          flaggedAt: new Date().toISOString(),
        },
      });
      return {
        ok: true,
        data: {
          flagged: true,
          platform,
          messageReference,
          severity,
          confirmationToCommunity:
            "I've flagged this for a teammate to review. They'll follow up directly.",
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't record flag: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
