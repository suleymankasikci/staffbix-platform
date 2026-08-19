import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * frame_weekly_decisions — Monday-morning briefing tool for the CEO
 * Advisor. Given the operator's situation summary, returns the top 3
 * decisions they should make this week, each framed as:
 *   { topic, options[], evidence[], recommendation, pushback }
 *
 * The Advisor's `pushbackLevel` setting tunes how directly the
 * "pushback" field challenges the operator. Default is "blunt"
 * (matching role-configs.ts default). Optional decision log entry
 * is written via log_decision (separate tool).
 */

const MODEL = "gpt-4o-mini";
const MIN_SITUATION_LEN = 30;
const MAX_SITUATION_LEN = 6000;
const PUSHBACK_LEVELS = ["gentle", "balanced", "blunt"] as const;

export const frameWeeklyDecisionsTool: Tool = {
  name: "frame_weekly_decisions",
  description:
    "Frame the top 2-3 decisions the operator should make this week. For each: name the topic, lay out 2-3 real options, cite evidence from the situation summary, recommend one, then write a 1-sentence pushback that names the bias / avoidance you suspect. Use this when the operator asks 'what should I focus on?' or 'frame my week'.",
  parameters: {
    type: "object",
    properties: {
      situation: {
        type: "string",
        description:
          "The current state of the business as the operator understands it. Numbers + open questions + decisions they're putting off.",
      },
      focusAreas: {
        type: "array",
        description:
          "Optional: subset of {strategy, hiring, product, sales, fundraising, operations, personal} to constrain scope.",
        items: { type: "string" },
      },
      pushbackLevel: {
        type: "string",
        description:
          "How directly to challenge the operator. 'gentle' suggests, 'balanced' counters, 'blunt' calls out avoidance.",
        enum: PUSHBACK_LEVELS,
      },
    },
    required: ["situation"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const situation = String(args.situation).trim();
    const focusAreas = Array.isArray(args.focusAreas)
      ? (args.focusAreas as string[]).filter((s) => typeof s === "string" && s.length > 0)
      : [];
    const pushbackLevel = ((args.pushbackLevel as string) ?? "blunt").toLowerCase();

    if (!(PUSHBACK_LEVELS as readonly string[]).includes(pushbackLevel)) {
      return {
        ok: false,
        refused: true,
        reason: `pushbackLevel must be one of: ${PUSHBACK_LEVELS.join(", ")}`,
      };
    }
    if (situation.length < MIN_SITUATION_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `situation too short (need ≥${MIN_SITUATION_LEN} chars).`,
      };
    }
    if (situation.length > MAX_SITUATION_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `situation too long (max ${MAX_SITUATION_LEN} chars).`,
      };
    }

    // Brand Bible grounding — we cite company-specific context where
    // relevant (e.g., "TrustCo is our biggest customer" → CEO Advisor
    // weights that decision higher).
    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: situation.slice(0, 500),
      k: 5,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches found — frame using only the situation summary)";

    const pushbackStyle =
      pushbackLevel === "blunt"
        ? "Be direct and specific. Name the avoidance behavior if you see it. No softening."
        : pushbackLevel === "balanced"
          ? "Challenge respectfully. Note trade-offs but don't shy away from a clear recommendation."
          : "Be gentle. Surface tensions as questions rather than accusations.";

    const focusClause =
      focusAreas.length > 0
        ? `Constrain decisions to these focus areas: ${focusAreas.join(", ")}.`
        : "Cover whichever areas matter most this week — don't pad if there isn't a third decision worth raising.";

    const systemPrompt = [
      "You are the CEO Advisor. You read the operator's situation summary and frame the 2-3 decisions they should make this week.",
      "Output STRICT JSON: { weekHeadline, decisions: [{ topic, options, evidence, recommendation, pushback }], openQuestions, oneSentenceMemo }.",
      "weekHeadline: 1 sentence — the single most important theme of the week.",
      "decisions: 2-3 entries. NEVER pad to 3 if 2 is correct.",
      "  topic: ≤10 words.",
      "  options: 2-3 strings, each a concrete option (not a vague 'consider X').",
      "  evidence: 1-3 strings citing facts from the situation summary.",
      "  recommendation: 1 sentence — pick one option, say why.",
      "  pushback: 1 sentence — name the bias, avoidance, or wishful thinking you suspect.",
      "openQuestions: 1-3 things the operator should answer before next week's briefing.",
      "oneSentenceMemo: a single tweet-length summary the operator could screenshot.",
      `Pushback style: ${pushbackStyle}`,
      focusClause,
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: situation },
        ],
        max_tokens: 1200,
        temperature: 0.4,
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

      const decisions = Array.isArray(parsed.decisions)
        ? (parsed.decisions as Record<string, unknown>[])
        : [];

      await logSecurityEvent({
        kind: "ceo.weekly.framed",
        tenantId: ctx.tenantId,
        payload: {
          subject: "ceo.weekly.framed",
          situationPreview: situation.slice(0, 160),
          focusAreas,
          pushbackLevel,
          decisionCount: decisions.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          weekHeadline:
            typeof parsed.weekHeadline === "string" ? parsed.weekHeadline : "",
          decisions: decisions.map((d) => ({
            topic: typeof d.topic === "string" ? d.topic : "",
            options: Array.isArray(d.options) ? (d.options as string[]) : [],
            evidence: Array.isArray(d.evidence) ? (d.evidence as string[]) : [],
            recommendation:
              typeof d.recommendation === "string" ? d.recommendation : "",
            pushback: typeof d.pushback === "string" ? d.pushback : "",
          })),
          openQuestions: Array.isArray(parsed.openQuestions)
            ? (parsed.openQuestions as string[])
            : [],
          oneSentenceMemo:
            typeof parsed.oneSentenceMemo === "string"
              ? parsed.oneSentenceMemo
              : "",
          pushbackLevel,
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Weekly framing failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
