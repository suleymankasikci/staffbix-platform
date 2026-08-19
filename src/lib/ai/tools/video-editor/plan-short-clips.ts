import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * plan_short_clips — given a long-form transcript with timestamps (or
 * a transcribed podcast), surface N candidate short clips for Reel /
 * TikTok / Short repurposing. Each clip carries:
 *   - startSec, endSec, durationSec
 *   - hookLine (the 'first 2 seconds' line that earns the watch)
 *   - title (≤8 words)
 *   - rationale (why this clip pops)
 *   - captionStyle ('open_captions' | 'kinetic_typography' | 'plain')
 *   - musicCue (only if operator allowed music)
 *
 * The model NEVER produces clips longer than maxDurationSec and NEVER
 * recommends a music style the operator hasn't enabled.
 */

const MODEL = "gpt-4o-mini";

const TARGET_FORMATS = [
  "reel_9_16",
  "tiktok_9_16",
  "youtube_short_9_16",
  "square_1_1",
  "landscape_16_9",
] as const;

const MUSIC_POLICIES = [
  "brand_licensed_only",
  "platform_native",
  "no_music",
] as const;

const MIN_TRANSCRIPT_LEN = 100;
const MAX_TRANSCRIPT_LEN = 15_000;

export const planShortClipsTool: Tool = {
  name: "plan_short_clips",
  description:
    "Identify candidate short-form clips from a long-form transcript. Returns N clips with startSec/endSec, hookLine, title, rationale, captionStyle, and (only when allowed) a musicCue. NEVER produces clips longer than maxDurationSec.",
  parameters: {
    type: "object",
    properties: {
      transcriptWithTimestamps: {
        type: "string",
        description:
          "Transcript text. Timestamps in '[mm:ss]' or '[hh:mm:ss]' notation are honoured. ≤15,000 chars.",
      },
      targetFormat: { type: "string", enum: TARGET_FORMATS },
      numClips: {
        type: "integer",
        description: "How many candidate clips to surface. 1-10. Default 3.",
        minimum: 1,
        maximum: 10,
      },
      maxDurationSec: {
        type: "integer",
        description: "Max clip length in seconds. Reels/TikTok caps default 60. YT Shorts 60.",
        minimum: 5,
        maximum: 180,
      },
      musicPolicy: { type: "string", enum: MUSIC_POLICIES },
      themeHint: {
        type: "string",
        description: "Optional theme to bias clip selection (e.g., 'launch-week teasers').",
      },
    },
    required: ["transcriptWithTimestamps", "targetFormat"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const transcript = String(args.transcriptWithTimestamps);
    const targetFormat = String(args.targetFormat);
    const numClips = Math.max(1, Math.min(10, Number(args.numClips ?? 3)));
    const maxDurationSec = Math.max(5, Math.min(180, Number(args.maxDurationSec ?? 60)));
    const musicPolicy =
      ((args.musicPolicy as string | undefined) ?? "brand_licensed_only").toLowerCase();
    const themeHint = args.themeHint ? String(args.themeHint).trim() : "";

    if (!(TARGET_FORMATS as readonly string[]).includes(targetFormat)) {
      return {
        ok: false,
        refused: true,
        reason: `targetFormat must be one of: ${TARGET_FORMATS.join(", ")}`,
      };
    }
    if (!(MUSIC_POLICIES as readonly string[]).includes(musicPolicy)) {
      return {
        ok: false,
        refused: true,
        reason: `musicPolicy must be one of: ${MUSIC_POLICIES.join(", ")}`,
      };
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
      query: `video editing hooks brand voice ${themeHint}`.slice(0, 300),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches — default to clean voice)";

    const musicClause =
      musicPolicy === "no_music"
        ? "musicCue MUST be 'none' on every clip."
        : musicPolicy === "platform_native"
          ? "musicCue may suggest 'platform_native' or 'none'; never name specific copyrighted tracks."
          : "musicCue may suggest 'brand_licensed' or 'none'; never name specific copyrighted tracks.";

    const systemPrompt = [
      "You are a Video Editor identifying short-form clip candidates from a long-form transcript.",
      `Output STRICT JSON: { format, clips }. format echoes targetFormat. clips is an array of EXACTLY ${numClips} entries.`,
      "Each clip: { startSec, endSec, durationSec, hookLine, title, rationale, captionStyle, musicCue }.",
      "startSec/endSec: integer seconds from the beginning of the source.",
      `durationSec: endSec - startSec. MUST be ≤ ${maxDurationSec}.`,
      "hookLine: the verbatim sentence that should open the clip (≤140 chars). Pull from transcript, do NOT invent.",
      "title: ≤8 words.",
      "rationale: 1 sentence — why this earns the watch.",
      "captionStyle: 'open_captions' | 'kinetic_typography' | 'plain'.",
      "musicCue: 'brand_licensed' | 'platform_native' | 'none'.",
      musicClause,
      "ABSOLUTE RULES:",
      "  - DO NOT invent quotes or facts not in transcript.",
      "  - DO NOT recommend music tracks by name.",
      themeHint ? `Theme hint: ${themeHint}` : "",
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
        max_tokens: 1300,
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

      const rawClips = Array.isArray(parsed.clips)
        ? (parsed.clips as Array<Record<string, unknown>>)
        : [];
      // Enforce max duration server-side: drop clips that violate.
      const clips = rawClips
        .map((c) => {
          const startSec = Math.max(0, Math.round(Number(c.startSec ?? 0)));
          const endSec = Math.max(startSec, Math.round(Number(c.endSec ?? 0)));
          const durationSec = endSec - startSec;
          const musicCueRaw =
            typeof c.musicCue === "string" ? (c.musicCue as string).toLowerCase() : "none";
          const musicCue =
            musicPolicy === "no_music"
              ? "none"
              : ["brand_licensed", "platform_native", "none"].includes(musicCueRaw)
                ? musicCueRaw
                : "none";
          return {
            startSec,
            endSec,
            durationSec,
            hookLine: typeof c.hookLine === "string" ? c.hookLine : "",
            title: typeof c.title === "string" ? c.title : "",
            rationale: typeof c.rationale === "string" ? c.rationale : "",
            captionStyle:
              typeof c.captionStyle === "string" &&
              ["open_captions", "kinetic_typography", "plain"].includes(c.captionStyle as string)
                ? (c.captionStyle as string)
                : "open_captions",
            musicCue,
          };
        })
        .filter((c) => c.durationSec > 0 && c.durationSec <= maxDurationSec);

      await logSecurityEvent({
        kind: "video.clips.planned",
        tenantId: ctx.tenantId,
        payload: {
          subject: "video.clips.planned",
          targetFormat,
          numClipsRequested: numClips,
          clipsReturned: clips.length,
          musicPolicy,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          targetFormat,
          numClipsRequested: numClips,
          maxDurationSec,
          musicPolicy,
          clips,
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Clip planning failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
