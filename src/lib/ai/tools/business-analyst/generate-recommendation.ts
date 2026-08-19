import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * generate_business_recommendation — given a structured observation
 * (typically "metric X moved Y% week-over-week") the Business Analyst
 * produces a 1-screen recommendation memo for the operator:
 *
 *   { headline, hypotheses[], recommendedActions[], risks[], confidence }
 *
 * The model grounds claims in Brand Bible chunks when available, but
 * the memo is *suggestion only* — Business Analyst's default approval
 * mode is "Suggestion only" (see role-configs.ts:495), so no action
 * fires automatically; the operator decides.
 */

const MODEL = "gpt-4o-mini";
const MIN_OBSERVATION_LEN = 20;
const MAX_OBSERVATION_LEN = 4000;

export const generateBusinessRecommendationTool: Tool = {
  name: "generate_business_recommendation",
  description:
    "Produce a structured 1-page business recommendation memo for the operator. Use AFTER compare_period_metric / compute_metric / query_leads_breakdown has surfaced a notable change. The memo is suggestion-only — never an instruction to act.",
  parameters: {
    type: "object",
    properties: {
      observation: {
        type: "string",
        description:
          "What did you observe? Include the metric, the change, and any supporting numbers. Example: 'Lead qualified count fell 35% WoW (12→8). Source breakdown: paid_search dropped from 9 to 3.'",
      },
      focusArea: {
        type: "string",
        description:
          "Optional: revenue, marketing, customer-health, ops, finance. Helps shape the recommendation lens.",
      },
      additionalContext: {
        type: "string",
        description:
          "Optional: anything else the operator should consider — recent campaign changes, known incidents, seasonality.",
      },
    },
    required: ["observation"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const observation = String(args.observation).trim();
    const focusArea = args.focusArea ? String(args.focusArea).trim() : "";
    const additionalContext = args.additionalContext
      ? String(args.additionalContext).trim()
      : "";

    if (observation.length < MIN_OBSERVATION_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `observation too short (need ≥${MIN_OBSERVATION_LEN} chars).`,
      };
    }
    if (observation.length > MAX_OBSERVATION_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `observation too long (max ${MAX_OBSERVATION_LEN} chars).`,
      };
    }

    const bbQuery = `${observation} ${focusArea} ${additionalContext}`.slice(0, 500);
    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: bbQuery,
      k: 4,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits
            .map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`)
            .join("\n\n")
        : "(no Brand Bible matches found)";

    const systemPrompt = [
      "You are a Business Analyst preparing a recommendation memo for the operator.",
      "Output STRICT JSON: { headline, hypotheses, recommendedActions, risks, confidence }.",
      "headline: 1 sentence describing the situation + the headline ask.",
      "hypotheses: 2-4 plausible explanations for what you observed. Each ≤25 words.",
      "recommendedActions: 2-4 concrete next steps the operator could take. Each ≤25 words.",
      "risks: 1-3 things that could go wrong if the operator acts (or doesn't).",
      "confidence: 'low' | 'medium' | 'high' — high requires strong supporting context.",
      "Be specific, not generic. Avoid filler like 'consider investigating'.",
      "Brand Bible context (use when relevant):",
      bbBlock,
    ].join("\n");

    const userParts = [`Observation: ${observation}`];
    if (focusArea) userParts.push(`Focus area: ${focusArea}`);
    if (additionalContext) userParts.push(`Additional context: ${additionalContext}`);
    const userContent = userParts.join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 700,
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
        kind: "ba.recommendation.generated",
        tenantId: ctx.tenantId,
        payload: {
          subject: "ba.recommendation.generated",
          observationPreview: observation.slice(0, 120),
          focusArea: focusArea || null,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          headline: typeof parsed.headline === "string" ? parsed.headline : "",
          hypotheses: Array.isArray(parsed.hypotheses)
            ? (parsed.hypotheses as string[])
            : [],
          recommendedActions: Array.isArray(parsed.recommendedActions)
            ? (parsed.recommendedActions as string[])
            : [],
          risks: Array.isArray(parsed.risks) ? (parsed.risks as string[]) : [],
          confidence:
            typeof parsed.confidence === "string"
              ? (parsed.confidence as string)
              : "medium",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Recommendation generation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
