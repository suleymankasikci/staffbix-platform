import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * summarize_call — given a transcript of an inbound phone call,
 * produce a structured post-call summary the operator can read in 20
 * seconds.
 *
 * Output JSON:
 *   - callerIntent: 1-line classification (booking / complaint /
 *     pricing / general / cancellation / VIP / other)
 *   - sentiment: 'positive' | 'neutral' | 'frustrated' | 'angry'
 *   - keyFacts: 2-5 strings of caller-supplied facts (name, account,
 *     issue identifiers)
 *   - openIssues: 1-3 things the caller wants resolved
 *   - suggestedFollowUp: 1 sentence — what should the operator do next
 *   - transferRequired: boolean — true if the call should escalate
 *   - transferReason: string explaining why, or "" if not required
 *
 * The Voice Agent will eventually live on a real telephony stack
 * (Twilio Voice / Vapi / Bland — Sprint 80+); for today the tool is
 * driven by an external transcription pipeline that posts the text
 * here after the call ends.
 */

const MODEL = "gpt-4o-mini";
const INTENT_TYPES = [
  "booking",
  "complaint",
  "pricing",
  "general_inquiry",
  "cancellation",
  "vip_request",
  "support_followup",
  "other",
] as const;
const SENTIMENT_TYPES = ["positive", "neutral", "frustrated", "angry"] as const;

const MIN_TRANSCRIPT_LEN = 40;
const MAX_TRANSCRIPT_LEN = 12_000;
const MAX_DURATION_SEC = 60 * 60 * 2; // 2h sanity cap

export const summarizeCallTool: Tool = {
  name: "summarize_call",
  description:
    "Produce a structured post-call summary from a transcript. Returns callerIntent, sentiment, keyFacts, openIssues, suggestedFollowUp, and a transferRequired flag with reason. Use after every inbound call.",
  parameters: {
    type: "object",
    properties: {
      callId: {
        type: "string",
        description: "Telephony provider call SID. Free-form string, ≤120 chars.",
      },
      transcript: {
        type: "string",
        description: "The call transcript. ≤12,000 chars. Speaker labels welcome but not required.",
      },
      callerPhoneE164: {
        type: "string",
        description: "Caller phone number in E.164 format if known. Optional.",
      },
      callerLang: {
        type: "string",
        description:
          "2-letter language code (en, tr, de, …). Used to summarize in the caller's language.",
      },
      durationSec: {
        type: "integer",
        description: "Call duration in seconds. 1-7200.",
        minimum: 1,
        maximum: MAX_DURATION_SEC,
      },
      isVip: {
        type: "boolean",
        description: "If true, the operator tagged this caller VIP. Always flag transferRequired=true.",
      },
    },
    required: ["callId", "transcript", "durationSec"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const callId = String(args.callId).trim().slice(0, 120);
    const transcript = String(args.transcript);
    const callerPhoneE164 = args.callerPhoneE164
      ? String(args.callerPhoneE164).trim()
      : "";
    const callerLang = args.callerLang
      ? String(args.callerLang).trim().toLowerCase()
      : "en";
    const durationSec = Number(args.durationSec ?? 0);
    const isVip = Boolean(args.isVip);

    if (callId.length < 3) {
      return { ok: false, refused: true, reason: "callId too short." };
    }
    if (transcript.trim().length < MIN_TRANSCRIPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `transcript too short (need ≥${MIN_TRANSCRIPT_LEN} chars).`,
      };
    }
    if (transcript.length > MAX_TRANSCRIPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `transcript too long (max ${MAX_TRANSCRIPT_LEN} chars).`,
      };
    }
    if (!Number.isFinite(durationSec) || durationSec < 1 || durationSec > MAX_DURATION_SEC) {
      return {
        ok: false,
        refused: true,
        reason: "durationSec must be 1-7200.",
      };
    }
    if (
      callerPhoneE164 &&
      !/^\+[1-9]\d{1,14}$/.test(callerPhoneE164)
    ) {
      return {
        ok: false,
        refused: true,
        reason: "callerPhoneE164 must be E.164 format (e.g., '+14155550100').",
      };
    }

    // Brand Bible context: pulls anything the agent should reflect
    // (escalation policy, VIP definition, brand voice in summaries).
    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `call summary escalation VIP support policy`.slice(0, 200),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches — apply common-sense defaults)";

    const systemPrompt = [
      `You are summarising an inbound phone call for the operator. Summarise in ${callerLang}.`,
      "Output STRICT JSON: { callerIntent, sentiment, keyFacts, openIssues, suggestedFollowUp, transferRequired, transferReason }.",
      `callerIntent: one of: ${INTENT_TYPES.join(", ")}.`,
      `sentiment: one of: ${SENTIMENT_TYPES.join(", ")}.`,
      "keyFacts: 2-5 short strings — names, account numbers, issue IDs explicitly stated.",
      "openIssues: 1-3 things the caller still needs resolved.",
      "suggestedFollowUp: 1 sentence — operator's next action.",
      "transferRequired: boolean. ALWAYS true when: sentiment=angry, intent=cancellation, intent=vip_request, or caller is explicitly tagged VIP. Also true if you cannot resolve confidently.",
      "transferReason: 1 sentence; '' if not required.",
      isVip ? "OVERRIDE: caller is tagged VIP. transferRequired MUST be true." : "",
      "Do NOT speculate beyond the transcript. If a fact isn't said, omit it.",
      "Brand Bible context:",
      bbBlock,
    ]
      .filter(Boolean)
      .join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        max_tokens: 700,
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      await recordAiUsage({
        tenantId: ctx.tenantId,
        workerId: ctx.workerId,
        conversationId: ctx.conversationId,
        provider: "openai",
        kind: "chat",
        model: MODEL,
        promptTokens: res.usage?.prompt_tokens ?? 0,
        completionTokens: res.usage?.completion_tokens ?? 0,
        latencyMs: Date.now() - t0,
      });

      const raw = res.choices[0]?.message?.content ?? "{}";
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return { ok: false, refused: true, reason: "Model returned invalid JSON." };
      }

      const callerIntent =
        typeof parsed.callerIntent === "string" &&
        (INTENT_TYPES as readonly string[]).includes(parsed.callerIntent as string)
          ? (parsed.callerIntent as string)
          : "other";
      const sentiment =
        typeof parsed.sentiment === "string" &&
        (SENTIMENT_TYPES as readonly string[]).includes(parsed.sentiment as string)
          ? (parsed.sentiment as string)
          : "neutral";
      let transferRequired = Boolean(parsed.transferRequired);
      if (isVip || sentiment === "angry" || callerIntent === "vip_request") {
        transferRequired = true;
      }
      const transferReason =
        typeof parsed.transferReason === "string"
          ? (parsed.transferReason as string)
          : "";

      await logSecurityEvent({
        kind: "voice.call.summarized",
        tenantId: ctx.tenantId,
        payload: {
          subject: "voice.call.summarized",
          callId,
          callerPhoneE164: callerPhoneE164 || null,
          callerLang,
          durationSec,
          callerIntent,
          sentiment,
          transferRequired,
          isVip,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          callId,
          callerPhoneE164: callerPhoneE164 || null,
          callerLang,
          durationSec,
          callerIntent,
          sentiment,
          keyFacts: Array.isArray(parsed.keyFacts)
            ? (parsed.keyFacts as string[])
            : [],
          openIssues: Array.isArray(parsed.openIssues)
            ? (parsed.openIssues as string[])
            : [],
          suggestedFollowUp:
            typeof parsed.suggestedFollowUp === "string"
              ? parsed.suggestedFollowUp
              : "",
          transferRequired,
          transferReason: transferRequired
            ? transferReason || (isVip ? "Caller is VIP." : "Escalation policy.")
            : "",
          isVip,
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Call summary failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
