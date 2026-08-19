import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * compile_feedback_digest — produce a weekly digest from pre-clustered
 * themes (typically output of cluster_feedback_themes).
 *
 * Output:
 *   - headline
 *   - topThemes: top N themes by itemCount (echoed verbatim)
 *   - growingThemes: themes where growthVsLastWeek ≥ growthThresholdPct
 *   - overallSentiment: 'positive' | 'neutral' | 'mixed' | 'negative'
 *   - recommendedActions: 2-5 strings
 *   - oneSentenceMemo
 */

const MODEL = "gpt-4o-mini";

const MIN_THEMES = 1;
const MAX_THEMES = 30;

export const compileFeedbackDigestTool: Tool = {
  name: "compile_feedback_digest",
  description:
    "Compile a weekly feedback digest from pre-clustered themes. Echoes theme names + counts; LLM only writes summary + recommended actions.",
  parameters: {
    type: "object",
    properties: {
      periodLabel: { type: "string" },
      themes: {
        type: "array",
        description:
          "1-30 theme summaries: { name, itemCount, sentimentBreakdown, suspectedOwner, growthVsLastWeekPct }.",
        items: { type: "object" },
      },
      growthThresholdPct: {
        type: "integer",
        description: "% week-over-week growth that qualifies as 'growing'. Default 50.",
        minimum: 1,
        maximum: 1000,
      },
      topN: {
        type: "integer",
        description: "How many top themes to surface. Default 5.",
        minimum: 1,
        maximum: 10,
      },
    },
    required: ["periodLabel", "themes"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const periodLabel = String(args.periodLabel).trim().slice(0, 40);
    const rawThemes = Array.isArray(args.themes)
      ? (args.themes as Array<Record<string, unknown>>)
      : [];
    const growthThresholdPct = Math.max(
      1,
      Math.min(1000, Math.round(Number(args.growthThresholdPct ?? 50))),
    );
    const topN = Math.max(1, Math.min(10, Math.round(Number(args.topN ?? 5))));

    if (periodLabel.length < 2) {
      return { ok: false, refused: true, reason: "periodLabel too short." };
    }
    if (rawThemes.length < MIN_THEMES || rawThemes.length > MAX_THEMES) {
      return {
        ok: false,
        refused: true,
        reason: `themes must have ${MIN_THEMES}-${MAX_THEMES} entries.`,
      };
    }

    const themes = rawThemes.map((t) => ({
      name: typeof t.name === "string" ? t.name : "",
      itemCount: Math.max(0, Math.round(Number(t.itemCount ?? 0))),
      sentimentBreakdown:
        typeof t.sentimentBreakdown === "object" && t.sentimentBreakdown !== null
          ? (t.sentimentBreakdown as Record<string, unknown>)
          : {},
      suspectedOwner:
        typeof t.suspectedOwner === "string" ? (t.suspectedOwner as string) : "",
      growthVsLastWeekPct: Number(t.growthVsLastWeekPct ?? 0),
    }));

    const totalItems = themes.reduce((s, t) => s + t.itemCount, 0);
    const totalPositive = themes.reduce(
      (s, t) => s + Number(t.sentimentBreakdown.positive ?? 0),
      0,
    );
    const totalNegative = themes.reduce(
      (s, t) => s + Number(t.sentimentBreakdown.negative ?? 0),
      0,
    );
    const overallSentiment =
      totalPositive > totalNegative * 1.5
        ? "positive"
        : totalNegative > totalPositive * 1.5
          ? "negative"
          : totalPositive === 0 && totalNegative === 0
            ? "neutral"
            : "mixed";

    const topThemes = [...themes]
      .sort((a, b) => b.itemCount - a.itemCount)
      .slice(0, topN);
    const growingThemes = themes.filter(
      (t) => t.growthVsLastWeekPct >= growthThresholdPct,
    );

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `feedback digest voice ${periodLabel}`.slice(0, 200),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const systemPrompt = [
      "You are the Feedback Analyst writing a weekly digest.",
      "Output STRICT JSON: { headline, recommendedActions, oneSentenceMemo }.",
      "headline: 1 sentence — the week's most important signal.",
      "recommendedActions: 2-5 strings, each ≤30 words. Tie each to a theme.suspectedOwner when relevant.",
      "oneSentenceMemo: tweet-length summary.",
      "ABSOLUTE RULES:",
      "  - NEVER invent themes / counts / sentiment beyond what's in the input.",
      `Aggregates: totalItems=${totalItems}, totalPositive=${totalPositive}, totalNegative=${totalNegative}, overallSentiment=${overallSentiment}.`,
      `growingThemes (≥${growthThresholdPct}% WoW): ${growingThemes.map((t) => t.name).join(", ") || "(none)"}`,
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: themes
              .map(
                (t) =>
                  `${t.name} · count=${t.itemCount} · owner=${t.suspectedOwner} · WoW=${t.growthVsLastWeekPct}%`,
              )
              .join("\n"),
          },
        ],
        max_tokens: 700,
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

      await logSecurityEvent({
        kind: "feedback.digest.compiled",
        tenantId: ctx.tenantId,
        payload: {
          subject: "feedback.digest.compiled",
          periodLabel,
          themesCount: themes.length,
          topNReturned: topThemes.length,
          growingCount: growingThemes.length,
          overallSentiment,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          periodLabel,
          totalItems,
          overallSentiment,
          topThemes,
          growingThemes,
          growthThresholdPct,
          headline: typeof parsed.headline === "string" ? parsed.headline : "",
          recommendedActions: Array.isArray(parsed.recommendedActions)
            ? (parsed.recommendedActions as string[]).slice(0, 5)
            : [],
          oneSentenceMemo:
            typeof parsed.oneSentenceMemo === "string"
              ? parsed.oneSentenceMemo
              : "",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Digest compile failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
