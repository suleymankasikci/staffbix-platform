import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * flag_call_transfer — log a transfer request for the on-call
 * operator. Used by Voice Agent in two cases:
 *   - mid-call (warm transfer requested by caller or detected trigger)
 *   - post-call (summarize_call returned transferRequired=true)
 *
 * Stored in security_events with subject='voice.transfer.requested'.
 * A future sprint adds push-notification dispatch + operator pickup
 * UI; today the log row + role-level alert config is enough for the
 * operator to be paged.
 */

const REASONS = [
  "vip_caller",
  "anger_detected",
  "cancellation_intent",
  "keyword_match",
  "low_confidence",
  "explicit_request",
  "policy_required",
  "other",
] as const;

const URGENCY_LEVELS = ["low", "normal", "high", "critical"] as const;

export const flagCallTransferTool: Tool = {
  name: "flag_call_transfer",
  description:
    "Log a warm-transfer request so the on-call operator gets paged. Use mid-call when a transfer trigger fires, or post-call when summarize_call returns transferRequired=true.",
  parameters: {
    type: "object",
    properties: {
      callId: { type: "string", description: "Telephony call SID. ≤120 chars." },
      callerPhoneE164: { type: "string", description: "Caller phone in E.164 if known." },
      reason: { type: "string", enum: REASONS },
      urgency: { type: "string", enum: URGENCY_LEVELS },
      summary: {
        type: "string",
        description: "1-3 sentence context for the operator so they can pick up cold.",
      },
      callbackNumberE164: {
        type: "string",
        description: "If the caller asked for a callback rather than live pickup, the callback number.",
      },
    },
    required: ["callId", "reason", "urgency", "summary"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const callId = String(args.callId).trim().slice(0, 120);
    const callerPhoneE164 = args.callerPhoneE164
      ? String(args.callerPhoneE164).trim()
      : "";
    const reason = String(args.reason);
    const urgency = String(args.urgency);
    const summary = String(args.summary).trim();
    const callbackNumberE164 = args.callbackNumberE164
      ? String(args.callbackNumberE164).trim()
      : "";

    if (callId.length < 3) {
      return { ok: false, refused: true, reason: "callId too short." };
    }
    if (!(REASONS as readonly string[]).includes(reason)) {
      return {
        ok: false,
        refused: true,
        reason: `reason must be one of: ${REASONS.join(", ")}`,
      };
    }
    if (!(URGENCY_LEVELS as readonly string[]).includes(urgency)) {
      return {
        ok: false,
        refused: true,
        reason: `urgency must be one of: ${URGENCY_LEVELS.join(", ")}`,
      };
    }
    if (summary.length < 10) {
      return {
        ok: false,
        refused: true,
        reason: "summary too short — give the operator enough to pick up cold.",
      };
    }
    if (callerPhoneE164 && !/^\+[1-9]\d{1,14}$/.test(callerPhoneE164)) {
      return {
        ok: false,
        refused: true,
        reason: "callerPhoneE164 must be E.164 (e.g., '+14155550100').",
      };
    }
    if (callbackNumberE164 && !/^\+[1-9]\d{1,14}$/.test(callbackNumberE164)) {
      return {
        ok: false,
        refused: true,
        reason: "callbackNumberE164 must be E.164.",
      };
    }

    try {
      await logSecurityEvent({
        kind: "voice.transfer.requested",
        tenantId: ctx.tenantId,
        payload: {
          subject: "voice.transfer.requested",
          callId,
          callerPhoneE164: callerPhoneE164 || null,
          reason,
          urgency,
          summary,
          callbackNumberE164: callbackNumberE164 || null,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          flagged: true,
          callId,
          reason,
          urgency,
          callbackQueued: Boolean(callbackNumberE164),
          notDispatchedNote:
            "Transfer request logged. Live operator paging (Twilio/Vapi) lands in Sprint 80+; the on-call rota config decides who is pinged.",
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't log transfer: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
