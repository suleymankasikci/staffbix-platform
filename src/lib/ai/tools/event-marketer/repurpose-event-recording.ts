import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * repurpose_event_recording — given a webinar / event transcript or
 * summary, propose N content pieces for repurposing across social,
 * email, blog, and short video.
 *
 * Output JSON:
 *   - pieces: array of EXACTLY numPieces entries:
 *       { platform, format, hook, body, ctaAngle, sourceTimestamp }
 *
 * Hard rules:
 *   - sourceTimestamp must reference timestamps that actually appear
 *     in the transcript when [mm:ss] tags are present.
 *   - DO NOT invent attendee counts, customer logos, NPS scores.
 */

const MODEL = "gpt-4o-mini";

const PLATFORMS = [
  "linkedin",
  "twitter",
  "instagram",
  "tiktok",
  "youtube_short",
  "email_newsletter",
  "blog_post",
] as const;

const FORMATS = [
  "long_form_post",
  "thread",
  "single_post",
  "short_video",
  "carousel",
  "email_digest",
  "blog_article",
] as const;

const MIN_TRANSCRIPT_LEN = 200;
const MAX_TRANSCRIPT_LEN = 18_000;
const MIN_PIECES = 1;
const MAX_PIECES = 10;

export const repurposeEventRecordingTool: Tool = {
  name: "repurpose_event_recording",
  description:
    "Propose N repurposed content pieces from an event transcript. Each piece pairs a platform + format with a hook + body + CTA angle. NEVER invents metrics or fabricates timestamps.",
  parameters: {
    type: "object",
    properties: {
      eventTitle: { type: "string", description: "Event title for context." },
      transcript: {
        type: "string",
        description:
          "Transcript or detailed summary of the event. Timestamps in [mm:ss] notation are preferred. ≤18,000 chars.",
      },
      numPieces: {
        type: "integer",
        description: "How many pieces to draft. 1-10. Default 5.",
        minimum: MIN_PIECES,
        maximum: MAX_PIECES,
      },
      preferredPlatforms: {
        type: "array",
        description:
          "Optional subset of platforms to bias toward. Empty means open to any.",
        items: { type: "string", enum: PLATFORMS },
      },
    },
    required: ["eventTitle", "transcript"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const eventTitle = String(args.eventTitle).trim();
    const transcript = String(args.transcript);
    const numPieces = Math.max(
      MIN_PIECES,
      Math.min(MAX_PIECES, Number(args.numPieces ?? 5)),
    );
    const preferredPlatforms = Array.isArray(args.preferredPlatforms)
      ? (args.preferredPlatforms as string[]).filter((p) =>
          (PLATFORMS as readonly string[]).includes(p),
        )
      : [];

    if (eventTitle.length < 3) {
      return { ok: false, refused: true, reason: "eventTitle too short." };
    }
    if (transcript.length < MIN_TRANSCRIPT_LEN) {
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

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `${eventTitle} content repurposing brand voice`.slice(0, 300),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const platformClause =
      preferredPlatforms.length > 0
        ? `Bias toward these platforms: ${preferredPlatforms.join(", ")}.`
        : `Choose from: ${PLATFORMS.join(", ")}.`;

    const systemPrompt = [
      "You are the Event Marketer repurposing a recorded event into platform-specific content pieces.",
      `Output STRICT JSON: { pieces } where pieces has EXACTLY ${numPieces} entries.`,
      "Each piece: { platform, format, hook, body, ctaAngle, sourceTimestamp }.",
      `platform: one of: ${PLATFORMS.join(", ")}.`,
      `format: one of: ${FORMATS.join(", ")}.`,
      "hook: ≤140 chars opening line, verbatim or near-verbatim from transcript.",
      "body: 1-3 paragraphs OR 3-7 bullet points depending on format. ≤300 words total.",
      "ctaAngle: ≤30 chars — what action you want the reader to take.",
      "sourceTimestamp: a [mm:ss] reference from the transcript if available; otherwise '[from summary]'.",
      "ABSOLUTE RULES:",
      "  - NEVER invent attendee counts, NPS scores, ARR, customer logos.",
      "  - NEVER invent quotes — pull verbatim.",
      platformClause,
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `eventTitle: ${eventTitle}\n\n${transcript}` },
        ],
        max_tokens: 1600,
        temperature: 0.3,
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

      const rawPieces = Array.isArray(parsed.pieces)
        ? (parsed.pieces as Array<Record<string, unknown>>)
        : [];
      const pieces = rawPieces
        .map((p) => ({
          platform:
            typeof p.platform === "string" &&
            (PLATFORMS as readonly string[]).includes(p.platform as string)
              ? (p.platform as string)
              : "linkedin",
          format:
            typeof p.format === "string" &&
            (FORMATS as readonly string[]).includes(p.format as string)
              ? (p.format as string)
              : "single_post",
          hook: typeof p.hook === "string" ? (p.hook as string) : "",
          body: typeof p.body === "string" ? (p.body as string) : "",
          ctaAngle: typeof p.ctaAngle === "string" ? (p.ctaAngle as string) : "",
          sourceTimestamp:
            typeof p.sourceTimestamp === "string"
              ? (p.sourceTimestamp as string)
              : "[from summary]",
        }))
        .filter((p) => p.hook.length > 0 && p.body.length > 0)
        .slice(0, numPieces);

      await logSecurityEvent({
        kind: "event.recording.repurposed",
        tenantId: ctx.tenantId,
        payload: {
          subject: "event.recording.repurposed",
          eventTitle,
          piecesRequested: numPieces,
          piecesReturned: pieces.length,
          preferredPlatforms,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          eventTitle,
          piecesRequested: numPieces,
          pieces,
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Repurpose failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
