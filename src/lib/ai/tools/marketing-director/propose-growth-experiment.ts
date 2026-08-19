import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * propose_growth_experiment — given the current marketing situation,
 * propose ONE high-confidence experiment for the next month. Output:
 *   - hypothesis: 'We believe X. We will know we're right if Y.'
 *   - experimentDesign: how it runs
 *   - primaryMetric, secondaryMetrics
 *   - budgetUsd, durationDays
 *   - expectedOutcome: realistic range
 *   - killCriteria: 1-3 thresholds that pause the test
 *   - confidence: low/medium/high
 *
 * One experiment per call — the Marketing Director defaults are to
 * focus, not scatter shots.
 */

const MODEL = "gpt-4o-mini";

const CHANNELS = [
  "paid_social",
  "seo",
  "email",
  "affiliate",
  "pr",
  "events",
  "influencer",
  "content",
  "referral",
  "other",
] as const;

const MIN_PROMPT_LEN = 30;
const MAX_PROMPT_LEN = 4000;

export const proposeGrowthExperimentTool: Tool = {
  name: "propose_growth_experiment",
  description:
    "Propose EXACTLY ONE growth experiment for the next month. Returns hypothesis (we-believe-X format), design, metrics, budget, duration, expected outcome, kill criteria, confidence. NEVER returns multiple experiments — focus is the point.",
  parameters: {
    type: "object",
    properties: {
      currentSituation: {
        type: "string",
        description:
          "Where the funnel sits today. Weeks of softness, channel ROAS, recent test results, anything relevant. 2-6 sentences.",
      },
      candidateChannel: {
        type: "string",
        enum: CHANNELS,
        description: "Optional — the channel you want the experiment to target.",
      },
      openQuestion: {
        type: "string",
        description: "What hypothesis are we trying to settle? 1-2 sentences.",
      },
      maxBudgetUsd: {
        type: "number",
        description: "Hard cap on experiment budget.",
        minimum: 100,
        maximum: 250_000,
      },
      maxDurationDays: {
        type: "integer",
        description: "Hard cap on experiment duration in days.",
        minimum: 3,
        maximum: 120,
      },
    },
    required: ["currentSituation", "openQuestion", "maxBudgetUsd", "maxDurationDays"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const currentSituation = String(args.currentSituation).trim();
    const candidateChannel = args.candidateChannel ? String(args.candidateChannel) : "";
    const openQuestion = String(args.openQuestion).trim();
    const maxBudgetUsd = Math.max(100, Math.min(250_000, Number(args.maxBudgetUsd)));
    const maxDurationDays = Math.max(3, Math.min(120, Number(args.maxDurationDays)));

    if (
      candidateChannel &&
      !(CHANNELS as readonly string[]).includes(candidateChannel)
    ) {
      return {
        ok: false,
        refused: true,
        reason: `candidateChannel must be one of: ${CHANNELS.join(", ")}`,
      };
    }
    if (currentSituation.length < MIN_PROMPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `currentSituation too short (need ≥${MIN_PROMPT_LEN} chars).`,
      };
    }
    if (currentSituation.length > MAX_PROMPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `currentSituation too long (max ${MAX_PROMPT_LEN} chars).`,
      };
    }
    if (openQuestion.length < 10) {
      return {
        ok: false,
        refused: true,
        reason: "openQuestion too short.",
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `${candidateChannel} growth experiment hypothesis ${openQuestion}`.slice(
        0,
        300,
      ),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const systemPrompt = [
      "You are the Marketing Director proposing ONE growth experiment.",
      "Output STRICT JSON: { hypothesis, experimentDesign, primaryMetric, secondaryMetrics, channel, budgetUsd, durationDays, expectedOutcome, killCriteria, confidence }.",
      "hypothesis: 'We believe X. We will know we're right if Y improves by Z.' format.",
      "experimentDesign: 2-3 sentences — control vs treatment, sample size approach, attribution.",
      "primaryMetric: ONE metric the experiment moves (e.g., 'CPL on prospect form').",
      "secondaryMetrics: 1-3 supporting metrics.",
      `channel: pick from: ${CHANNELS.join(", ")}.${candidateChannel ? ` Prefer the operator's candidateChannel: ${candidateChannel}.` : ""}`,
      `budgetUsd: number ≤ ${maxBudgetUsd}.`,
      `durationDays: integer ≤ ${maxDurationDays}.`,
      "expectedOutcome: a realistic range (e.g., '5-15% CPL reduction').",
      "killCriteria: 1-3 explicit thresholds that pause the test early (e.g., 'kill if CPL exceeds $X for 5 consecutive days').",
      "confidence: 'low' | 'medium' | 'high'.",
      "ONLY one experiment. DO NOT bundle multiple ideas.",
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const userContent = [
      `openQuestion: ${openQuestion}`,
      candidateChannel ? `candidateChannel: ${candidateChannel}` : "",
      `maxBudgetUsd: ${maxBudgetUsd}`,
      `maxDurationDays: ${maxDurationDays}`,
      "",
      "currentSituation:",
      currentSituation,
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

      // Enforce caps server-side; if the model exceeded them, clamp.
      const budget =
        typeof parsed.budgetUsd === "number" && Number.isFinite(parsed.budgetUsd)
          ? Math.min(maxBudgetUsd, Math.max(0, parsed.budgetUsd as number))
          : maxBudgetUsd;
      const duration =
        typeof parsed.durationDays === "number" && Number.isFinite(parsed.durationDays)
          ? Math.min(maxDurationDays, Math.max(1, Math.round(parsed.durationDays as number)))
          : maxDurationDays;

      const channel =
        typeof parsed.channel === "string" &&
        (CHANNELS as readonly string[]).includes(parsed.channel as string)
          ? (parsed.channel as string)
          : candidateChannel || "other";

      await logSecurityEvent({
        kind: "md.experiment.proposed",
        tenantId: ctx.tenantId,
        payload: {
          subject: "md.experiment.proposed",
          channel,
          budgetUsd: budget,
          durationDays: duration,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          hypothesis:
            typeof parsed.hypothesis === "string" ? parsed.hypothesis : "",
          experimentDesign:
            typeof parsed.experimentDesign === "string"
              ? parsed.experimentDesign
              : "",
          primaryMetric:
            typeof parsed.primaryMetric === "string" ? parsed.primaryMetric : "",
          secondaryMetrics: Array.isArray(parsed.secondaryMetrics)
            ? (parsed.secondaryMetrics as string[]).slice(0, 3)
            : [],
          channel,
          budgetUsd: budget,
          durationDays: duration,
          expectedOutcome:
            typeof parsed.expectedOutcome === "string"
              ? parsed.expectedOutcome
              : "",
          killCriteria: Array.isArray(parsed.killCriteria)
            ? (parsed.killCriteria as string[]).slice(0, 3)
            : [],
          confidence:
            typeof parsed.confidence === "string"
              ? (parsed.confidence as string)
              : "medium",
          notForLaunch:
            "Experiment plan only. Operator approves budget + design before any spend kicks off.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Experiment proposal failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
