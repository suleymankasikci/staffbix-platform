import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * plan_ad_campaign — produce a structured campaign plan for the
 * operator. The plan covers audience targeting, creative direction,
 * budget split across platforms, KPIs, A/B test variants, and a pause
 * rule. Approval mode is "Approval required" — this tool NEVER
 * launches anything; it stages the plan for operator review.
 *
 * Hard constraints enforced server-side:
 *   - total daily budget across the split ≤ operator dailyBudgetUsd
 *   - 1-4 platforms accepted
 *   - explicit pauseRule cited in output
 */

const MODEL = "gpt-4o-mini";

const PLATFORMS = [
  "meta_ads",
  "google_ads",
  "tiktok_ads",
  "linkedin_ads",
  "x_ads",
  "pinterest_ads",
] as const;

const OBJECTIVES = [
  "awareness",
  "traffic",
  "engagement",
  "leads",
  "sales",
  "app_installs",
  "video_views",
] as const;

const MIN_BRIEF_LEN = 30;
const MAX_BRIEF_LEN = 3000;

export const planAdCampaignTool: Tool = {
  name: "plan_ad_campaign",
  description:
    "Plan an ad campaign across 1-4 platforms. Returns audience targeting, creative direction, daily-budget split (sums to ≤ dailyBudgetUsd), KPIs, 3 A/B creative angles, pause rule. NEVER launches the campaign — staged for operator approval.",
  parameters: {
    type: "object",
    properties: {
      productOrOffer: {
        type: "string",
        description: "What is being advertised. 1-3 sentences.",
      },
      objective: { type: "string", enum: OBJECTIVES },
      platforms: {
        type: "array",
        description: "1-4 platforms from the supported list.",
        items: { type: "string", enum: PLATFORMS },
      },
      dailyBudgetUsd: {
        type: "number",
        description: "Total daily budget cap across all platforms (USD).",
        minimum: 1,
        maximum: 100_000,
      },
      audienceDescription: {
        type: "string",
        description: "Operator-supplied audience description. 1-3 sentences.",
      },
      kpiTargets: {
        type: "array",
        description:
          "Targets the operator wants to hit (e.g., 'ROAS ≥ 2.5', 'CPL ≤ $30'). 1-5 entries.",
        items: { type: "string" },
      },
      pauseRule: {
        type: "string",
        description:
          "Operator-supplied pause rule (e.g., 'pause below 1.5× ROAS after 48h'). ≤200 chars.",
      },
    },
    required: ["productOrOffer", "objective", "platforms", "dailyBudgetUsd", "audienceDescription"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const productOrOffer = String(args.productOrOffer).trim();
    const objective = String(args.objective);
    const rawPlatforms = Array.isArray(args.platforms)
      ? (args.platforms as string[])
      : [];
    const platforms = rawPlatforms
      .filter((p) => (PLATFORMS as readonly string[]).includes(p))
      .slice(0, 4);
    const dailyBudgetUsd = Number(args.dailyBudgetUsd);
    const audienceDescription = String(args.audienceDescription).trim();
    const kpiTargets = Array.isArray(args.kpiTargets)
      ? (args.kpiTargets as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 5)
      : [];
    const pauseRule = args.pauseRule
      ? String(args.pauseRule).trim().slice(0, 200)
      : "Pause any ad below 1.5× ROAS after 48h of spend.";

    if (productOrOffer.length < MIN_BRIEF_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `productOrOffer too short (need ≥${MIN_BRIEF_LEN} chars).`,
      };
    }
    if (productOrOffer.length > MAX_BRIEF_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `productOrOffer too long (max ${MAX_BRIEF_LEN} chars).`,
      };
    }
    if (!(OBJECTIVES as readonly string[]).includes(objective)) {
      return {
        ok: false,
        refused: true,
        reason: `objective must be one of: ${OBJECTIVES.join(", ")}`,
      };
    }
    if (platforms.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: `platforms must include at least one of: ${PLATFORMS.join(", ")}`,
      };
    }
    if (!Number.isFinite(dailyBudgetUsd) || dailyBudgetUsd < 1) {
      return {
        ok: false,
        refused: true,
        reason: "dailyBudgetUsd must be ≥ 1.",
      };
    }
    if (audienceDescription.length < 10) {
      return {
        ok: false,
        refused: true,
        reason: "audienceDescription too short.",
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `${objective} ${productOrOffer} target audience voice`.slice(0, 300),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const systemPrompt = [
      "You are planning an ad campaign for the operator. The plan is staged for review — you do not launch.",
      "Output STRICT JSON: { conceptHeadline, audienceTargeting, creativeDirection, budgetSplit, kpiTargets, abVariants, pauseRule, complianceFlags }.",
      "conceptHeadline: ≤14 words — the campaign idea in one line.",
      "audienceTargeting: 1 paragraph — interests, behaviours, exclusions, geography.",
      "creativeDirection: 1 paragraph — visual approach, hook, tone.",
      `budgetSplit: array of { platform, dailyBudgetUsd, rationale }. Cover EXACTLY the requested platforms (${platforms.join(", ")}). The sum of dailyBudgetUsd MUST equal ${dailyBudgetUsd}.`,
      "kpiTargets: 2-5 specific KPI targets (CTR, CPL, ROAS, etc.).",
      "abVariants: 3 creative angles to A/B test. Each entry: { angle, sampleHeadline, sampleBody }.",
      `pauseRule: echo or refine: '${pauseRule}'.`,
      "complianceFlags: 0-3 warnings (e.g., 'before/after imagery is restricted on Meta health vertical').",
      "ABSOLUTE RULES:",
      "  - NEVER invent performance metrics in sampleHeadline/sampleBody (X% off OK if operator confirmed; raw 'increased revenue by 300%' is forbidden unless cited in Brand Bible).",
      "  - NEVER claim regulatory certifications (FDA / CE / ISO) unless in Brand Bible.",
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const userContent = [
      `productOrOffer: ${productOrOffer}`,
      `objective: ${objective}`,
      `platforms: ${platforms.join(", ")}`,
      `dailyBudgetUsd: ${dailyBudgetUsd}`,
      `audienceDescription: ${audienceDescription}`,
      kpiTargets.length > 0 ? `operatorKpiTargets: ${kpiTargets.join("; ")}` : "",
      `pauseRule: ${pauseRule}`,
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
        max_tokens: 1300,
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

      // Enforce: budgetSplit must cover all platforms and sum to budget.
      const rawSplit = Array.isArray(parsed.budgetSplit)
        ? (parsed.budgetSplit as Array<Record<string, unknown>>)
        : [];
      let normalisedSplit = rawSplit
        .map((s) => ({
          platform: typeof s.platform === "string" ? (s.platform as string) : "",
          dailyBudgetUsd: Number(s.dailyBudgetUsd),
          rationale: typeof s.rationale === "string" ? (s.rationale as string) : "",
        }))
        .filter((s) => platforms.includes(s.platform as (typeof PLATFORMS)[number]));

      const splitTotal = normalisedSplit.reduce(
        (sum, s) => sum + (Number.isFinite(s.dailyBudgetUsd) ? s.dailyBudgetUsd : 0),
        0,
      );
      const budgetAdjusted = Math.abs(splitTotal - dailyBudgetUsd) > 0.01;
      // If totals don't match or platforms missing, fall back to an
      // even split across the requested platforms.
      if (
        budgetAdjusted ||
        normalisedSplit.length !== platforms.length ||
        new Set(normalisedSplit.map((s) => s.platform)).size !== platforms.length
      ) {
        const perPlatform = Number((dailyBudgetUsd / platforms.length).toFixed(2));
        normalisedSplit = platforms.map((p) => ({
          platform: p,
          dailyBudgetUsd: perPlatform,
          rationale: "Even split — model output didn't sum cleanly; review before launch.",
        }));
      }

      await logSecurityEvent({
        kind: "ad.campaign.planned",
        tenantId: ctx.tenantId,
        payload: {
          subject: "ad.campaign.planned",
          objective,
          platforms,
          dailyBudgetUsd,
          budgetAdjusted,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          objective,
          platforms,
          dailyBudgetUsd,
          conceptHeadline:
            typeof parsed.conceptHeadline === "string" ? parsed.conceptHeadline : "",
          audienceTargeting:
            typeof parsed.audienceTargeting === "string" ? parsed.audienceTargeting : "",
          creativeDirection:
            typeof parsed.creativeDirection === "string" ? parsed.creativeDirection : "",
          budgetSplit: normalisedSplit,
          budgetAdjusted,
          kpiTargets: Array.isArray(parsed.kpiTargets)
            ? (parsed.kpiTargets as string[])
            : kpiTargets,
          abVariants: Array.isArray(parsed.abVariants)
            ? (parsed.abVariants as Array<Record<string, unknown>>)
            : [],
          pauseRule:
            typeof parsed.pauseRule === "string" ? parsed.pauseRule : pauseRule,
          complianceFlags: Array.isArray(parsed.complianceFlags)
            ? (parsed.complianceFlags as string[])
            : [],
          notForLaunch:
            "Plan only. No campaigns created. Operator must approve before launch.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Ad campaign planning failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
