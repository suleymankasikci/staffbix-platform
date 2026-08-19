import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * draft_guest_invitation — write a personalised podcast guest
 * invitation. Output:
 *   - subjectLines: 3 variants
 *   - body: ≤200 words
 *   - recordingLogistics: 1 line on length / format
 *   - askLine: explicit ask with placeholder for the calendar link
 *   - postRecordingNote: 1 line on follow-up
 *
 * Hard rules: NEVER invent prior conversations or pretend to have
 * heard a guest's work that the operator didn't supply.
 */

const MODEL = "gpt-4o-mini";

const SHOW_FORMATS = [
  "weekly_30min",
  "weekly_60min",
  "biweekly_45min",
  "monthly_45min",
  "fireside_20min",
] as const;

const MIN_TOPIC_LEN = 20;
const MAX_TOPIC_LEN = 600;

export const draftGuestInvitationTool: Tool = {
  name: "draft_guest_invitation",
  description:
    "Write a personalised podcast guest invitation: 3 subject lines + body (≤200 words) + recording logistics + ask + post-recording note. NEVER invents prior conversations or claims to have read work the operator didn't reference.",
  parameters: {
    type: "object",
    properties: {
      guestName: { type: "string" },
      guestRoleCompany: {
        type: "string",
        description: "How the guest is positioned (e.g., 'CTO at Acme Corp').",
      },
      showName: { type: "string" },
      showFormat: { type: "string", enum: SHOW_FORMATS },
      topicAngle: {
        type: "string",
        description:
          "Why this guest, on this topic, now. 1-3 sentences. The model uses this verbatim — no invention.",
      },
      mutualReference: {
        type: "string",
        description:
          "Optional: a real mutual or referrer. Empty means the email opens cold (no fake mutual).",
      },
      calendarLinkPlaceholder: {
        type: "string",
        description:
          "Operator's calendar link or placeholder (e.g., '<calendly_link>'). The model uses this verbatim.",
      },
    },
    required: ["guestName", "guestRoleCompany", "showName", "showFormat", "topicAngle"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const guestName = String(args.guestName).trim();
    const guestRoleCompany = String(args.guestRoleCompany).trim();
    const showName = String(args.showName).trim();
    const showFormat = String(args.showFormat);
    const topicAngle = String(args.topicAngle).trim();
    const mutualReference = args.mutualReference
      ? String(args.mutualReference).trim()
      : "";
    const calendarLinkPlaceholder = args.calendarLinkPlaceholder
      ? String(args.calendarLinkPlaceholder).trim()
      : "<calendar_link>";

    if (!(SHOW_FORMATS as readonly string[]).includes(showFormat)) {
      return {
        ok: false,
        refused: true,
        reason: `showFormat must be one of: ${SHOW_FORMATS.join(", ")}`,
      };
    }
    if (guestName.length < 2) {
      return { ok: false, refused: true, reason: "guestName too short." };
    }
    if (guestRoleCompany.length < 5) {
      return {
        ok: false,
        refused: true,
        reason: "guestRoleCompany too short.",
      };
    }
    if (showName.length < 3) {
      return { ok: false, refused: true, reason: "showName too short." };
    }
    if (topicAngle.length < MIN_TOPIC_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `topicAngle too short (need ≥${MIN_TOPIC_LEN} chars).`,
      };
    }
    if (topicAngle.length > MAX_TOPIC_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `topicAngle too long (max ${MAX_TOPIC_LEN} chars).`,
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `${showName} podcast invitation voice ${showFormat}`.slice(0, 300),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const mutualClause = mutualReference
      ? `Open with a brief reference to: ${mutualReference}.`
      : "Open cold — DO NOT invent a mutual, prior meeting, or social connection.";

    const formatLogistics: Record<(typeof SHOW_FORMATS)[number], string> = {
      weekly_30min: "30-minute remote recording, video on, light edit, publishes weekly.",
      weekly_60min: "60-minute remote recording, conversational, publishes weekly.",
      biweekly_45min: "45-minute remote recording, structured + free chat, publishes bi-weekly.",
      monthly_45min: "45-minute remote recording, edited deeply, publishes monthly.",
      fireside_20min: "20-minute remote fireside, single-topic deep dive.",
    };

    const systemPrompt = [
      "You are the Podcast Producer writing a guest invitation email.",
      "Output STRICT JSON: { subjectLines, body, recordingLogistics, askLine, postRecordingNote, warnings }.",
      "subjectLines: EXACTLY 3 strings, each ≤60 chars, distinct tones.",
      "body: ≤200 words. Reference the guest's role+company verbatim, the topicAngle verbatim. Show clear respect for their time.",
      `recordingLogistics: '${formatLogistics[showFormat as (typeof SHOW_FORMATS)[number]]}'.`,
      `askLine: 1 sentence with the calendar link placeholder '${calendarLinkPlaceholder}'.`,
      "postRecordingNote: 1 sentence on what happens after recording.",
      "warnings: 0-3 strings — risks the operator should know about.",
      "ABSOLUTE RULES:",
      "  - NEVER claim to have heard prior podcasts / talks / work unless explicitly named in topicAngle.",
      "  - NEVER invent mutual connections.",
      mutualClause,
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const userContent = [
      `guestName: ${guestName}`,
      `guestRoleCompany: ${guestRoleCompany}`,
      `showName: ${showName}`,
      `showFormat: ${showFormat}`,
      `calendarLinkPlaceholder: ${calendarLinkPlaceholder}`,
      mutualReference ? `mutualReference: ${mutualReference}` : "",
      "",
      "topicAngle:",
      topicAngle,
    ]
      .filter(Boolean)
      .join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 900,
        temperature: 0.35,
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

      await logSecurityEvent({
        kind: "podcast.invite.drafted",
        tenantId: ctx.tenantId,
        payload: {
          subject: "podcast.invite.drafted",
          guestName,
          showName,
          showFormat,
          hasMutual: Boolean(mutualReference),
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          guestName,
          showName,
          showFormat,
          subjectLines: Array.isArray(parsed.subjectLines)
            ? (parsed.subjectLines as string[]).slice(0, 3)
            : [],
          body: typeof parsed.body === "string" ? parsed.body : "",
          recordingLogistics:
            typeof parsed.recordingLogistics === "string"
              ? parsed.recordingLogistics
              : formatLogistics[showFormat as (typeof SHOW_FORMATS)[number]],
          askLine: typeof parsed.askLine === "string" ? parsed.askLine : "",
          postRecordingNote:
            typeof parsed.postRecordingNote === "string"
              ? parsed.postRecordingNote
              : "",
          warnings: Array.isArray(parsed.warnings)
            ? (parsed.warnings as string[])
            : [],
          notForSend:
            "Draft only. Operator approves before any send to the guest.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Guest invitation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
