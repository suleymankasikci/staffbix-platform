import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * generate_friday_review — produce a 3-bullet Friday review:
 *   1. shipped this week (with evidence)
 *   2. slipped (and why)
 *   3. focus next week (top priority + KPI)
 *
 * Plus a one-sentence memo and a "lessonOfTheWeek" reflection.
 */

const MODEL = "gpt-4o-mini";
const MIN_PROMPT_LEN = 30;
const MAX_PROMPT_LEN = 4000;

export const generateFridayReviewTool: Tool = {
  name: "generate_friday_review",
  description:
    "Produce the Friday review: shipped, slipped, focus next week. Use this at the end of every week. Returns 3 bullet groups + memo + lesson.",
  parameters: {
    type: "object",
    properties: {
      weeklyOutcomes: {
        type: "string",
        description:
          "What actually happened this week: shipped, missed, customer reactions, KPI movement. 2-6 sentences.",
      },
      northStarKpis: {
        type: "array",
        description: "Same KPI list passed to generate_weekly_plan. 2-6 entries.",
        items: { type: "string" },
      },
      kpiMovement: {
        type: "array",
        description: "Optional explicit numbers (e.g., 'Revenue: 32k → 38k (+19%)'). Each ≤120 chars.",
        items: { type: "string" },
      },
    },
    required: ["weeklyOutcomes", "northStarKpis"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const weeklyOutcomes = String(args.weeklyOutcomes).trim();
    const northStarKpis = Array.isArray(args.northStarKpis)
      ? (args.northStarKpis as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 6)
      : [];
    const kpiMovement = Array.isArray(args.kpiMovement)
      ? (args.kpiMovement as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 10)
      : [];

    if (weeklyOutcomes.length < MIN_PROMPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `weeklyOutcomes too short (need ≥${MIN_PROMPT_LEN} chars).`,
      };
    }
    if (weeklyOutcomes.length > MAX_PROMPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `weeklyOutcomes too long (max ${MAX_PROMPT_LEN} chars).`,
      };
    }
    if (northStarKpis.length < 2) {
      return {
        ok: false,
        refused: true,
        reason: "northStarKpis must have at least 2 entries.",
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `weekly review retrospective ${northStarKpis.join(" ")}`.slice(0, 300),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const systemPrompt = [
      "You are the General Manager writing the Friday review.",
      "Output STRICT JSON: { headline, shipped, slipped, focusNextWeek, oneSentenceMemo, lessonOfTheWeek }.",
      "headline: 1 sentence — the week in one line.",
      "shipped: 1-4 strings. What actually went live / closed.",
      "slipped: 1-4 strings. Each item paired with a brief reason ('slipped X — root cause: Y').",
      "focusNextWeek: 1-3 strings. Each tied to a northStarKpi.",
      "oneSentenceMemo: tweet-length.",
      "lessonOfTheWeek: 1-2 sentences — a reusable insight, not a platitude.",
      "DO NOT invent specific numbers; only echo numbers explicitly present in weeklyOutcomes or kpiMovement.",
      `Operator north-star KPIs: ${northStarKpis.join(", ")}`,
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const userContent = [
      kpiMovement.length > 0
        ? `kpiMovement:\n${kpiMovement.map((m) => `  - ${m}`).join("\n")}`
        : "",
      "",
      "weeklyOutcomes:",
      weeklyOutcomes,
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
        kind: "gm.friday.reviewed",
        tenantId: ctx.tenantId,
        payload: {
          subject: "gm.friday.reviewed",
          kpiCount: northStarKpis.length,
          kpiMovementCount: kpiMovement.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          headline: typeof parsed.headline === "string" ? parsed.headline : "",
          shipped: Array.isArray(parsed.shipped)
            ? (parsed.shipped as string[])
            : [],
          slipped: Array.isArray(parsed.slipped)
            ? (parsed.slipped as string[])
            : [],
          focusNextWeek: Array.isArray(parsed.focusNextWeek)
            ? (parsed.focusNextWeek as string[])
            : [],
          oneSentenceMemo:
            typeof parsed.oneSentenceMemo === "string"
              ? parsed.oneSentenceMemo
              : "",
          lessonOfTheWeek:
            typeof parsed.lessonOfTheWeek === "string"
              ? parsed.lessonOfTheWeek
              : "",
          northStarKpis,
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Friday review failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
