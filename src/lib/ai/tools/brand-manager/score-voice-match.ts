import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * score_voice_match — given a piece of output, score it against the
 * tenant's Brand Bible. Returns:
 *   - matchScore: 0-100 (LLM-rated)
 *   - strengths[]: what aligns
 *   - drifts[]: where it diverges
 *   - suggestedRevisions[]: concrete rewrites
 *   - wouldShip: matchScore >= voiceMatchFloorPct
 *   - bannedPhraseFlags[]: server-side regex flags
 *
 * The score is informational; `wouldShip` is the operator-trustable
 * boolean (matchScore >= floor AND no banned phrases).
 */

const MODEL = "gpt-4o-mini";

const OUTPUT_KINDS = [
  "email",
  "social_post",
  "press_release",
  "blog_post",
  "support_reply",
  "ad_copy",
  "video_script",
  "other",
] as const;

const MIN_TEXT_LEN = 20;
const MAX_TEXT_LEN = 6000;
const MIN_FLOOR = 50;
const MAX_FLOOR = 100;

// Server-side banned phrases supplement the model's judgement. The
// model can score whatever, but if any of these match we always set
// wouldShip=false.
const HARD_BANNED_PATTERNS = [
  /\bAI generated\b/i,
  /\bas an AI\b/i,
  /\b100% guaranteed\b/i,
];

export const scoreVoiceMatchTool: Tool = {
  name: "score_voice_match",
  description:
    "Score a piece of output (email/social/press/blog/etc.) against the tenant's Brand Bible. Returns matchScore, strengths, drifts, suggested revisions, and a wouldShip boolean (matchScore ≥ floor + no banned phrases). Use BEFORE shipping any worker output.",
  parameters: {
    type: "object",
    properties: {
      text: { type: "string", description: "The output to score." },
      outputKind: { type: "string", enum: OUTPUT_KINDS },
      voiceMatchFloorPct: {
        type: "integer",
        description: "Floor for wouldShip. Default 90.",
        minimum: MIN_FLOOR,
        maximum: MAX_FLOOR,
      },
      authoringWorkerSlug: {
        type: "string",
        description: "Optional: which worker role authored this. Used for telemetry.",
      },
    },
    required: ["text", "outputKind"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const text = String(args.text);
    const outputKind = String(args.outputKind);
    const voiceMatchFloorPct = Math.max(
      MIN_FLOOR,
      Math.min(MAX_FLOOR, Number(args.voiceMatchFloorPct ?? 90)),
    );
    const authoringWorkerSlug = args.authoringWorkerSlug
      ? String(args.authoringWorkerSlug).trim()
      : "";

    if (!(OUTPUT_KINDS as readonly string[]).includes(outputKind)) {
      return {
        ok: false,
        refused: true,
        reason: `outputKind must be one of: ${OUTPUT_KINDS.join(", ")}`,
      };
    }
    if (text.trim().length < MIN_TEXT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `text too short (need ≥${MIN_TEXT_LEN} chars).`,
      };
    }
    if (text.length > MAX_TEXT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `text too long (max ${MAX_TEXT_LEN} chars).`,
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: text.slice(0, 400),
      k: 5,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    if (hits.length === 0) {
      // Without a Brand Bible we can't legitimately score voice match.
      // Refuse rather than fabricate a score.
      return {
        ok: false,
        refused: true,
        reason:
          "No Brand Bible content found — voice match can't be scored against an empty reference.",
      };
    }
    const bbBlock = hits
      .map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`)
      .join("\n\n");

    const systemPrompt = [
      "You are the Brand Manager scoring a piece of output against the Brand Bible.",
      "Output STRICT JSON: { matchScore, strengths, drifts, suggestedRevisions, summary }.",
      "matchScore: integer 0-100 — how closely the output matches the Brand Bible voice. Score honestly; reserve 95+ for genuine alignment.",
      "strengths: 1-3 specific strings — what the output does right.",
      "drifts: 0-5 specific strings — voice/tone/structure deviations. Reference the Brand Bible passage when relevant.",
      "suggestedRevisions: 0-3 strings — concrete rewrites for the most important drifts.",
      "summary: 1 sentence overall verdict.",
      "ABSOLUTE RULES:",
      "  - DO NOT score above 80 if the output contains 'as an AI', 'AI generated', or absolute guarantees.",
      "  - DO NOT invent fictional Brand Bible quotes.",
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `outputKind: ${outputKind}\n\n${text}` },
        ],
        max_tokens: 800,
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

      const matchScoreRaw = Number(parsed.matchScore);
      const matchScore = Number.isFinite(matchScoreRaw)
        ? Math.max(0, Math.min(100, Math.round(matchScoreRaw)))
        : 0;

      const bannedPhraseFlags: string[] = [];
      for (const re of HARD_BANNED_PATTERNS) {
        const m = text.match(re);
        if (m) bannedPhraseFlags.push(`banned phrase: '${m[0]}'`);
      }

      const wouldShip =
        matchScore >= voiceMatchFloorPct && bannedPhraseFlags.length === 0;

      await logSecurityEvent({
        kind: "brand.voice.scored",
        tenantId: ctx.tenantId,
        payload: {
          subject: "brand.voice.scored",
          outputKind,
          matchScore,
          voiceMatchFloorPct,
          bannedPhrasesCount: bannedPhraseFlags.length,
          wouldShip,
          authoringWorkerSlug: authoringWorkerSlug || null,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          outputKind,
          voiceMatchFloorPct,
          matchScore,
          summary: typeof parsed.summary === "string" ? parsed.summary : "",
          strengths: Array.isArray(parsed.strengths)
            ? (parsed.strengths as string[])
            : [],
          drifts: Array.isArray(parsed.drifts)
            ? (parsed.drifts as string[])
            : [],
          suggestedRevisions: Array.isArray(parsed.suggestedRevisions)
            ? (parsed.suggestedRevisions as string[])
            : [],
          bannedPhraseFlags,
          wouldShip,
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Voice scoring failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
