import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * forecast_pipeline — weighted-pipeline forecast for a window. Each
 * deal carries an ARR, stage, expectedCloseIso, and confidence (0-100).
 * The forecast multiplies ARR by stage probability + confidence, sums
 * within the target window, and reports:
 *   - committed (≥ commitConfidencePct)
 *   - bestCase (any deal in-window)
 *   - weighted (sum of arr × probability)
 *   - perStage breakdown
 *   - confidenceVsFloor: boolean — does committed/quota clear floor
 *
 * No LLM. Pure deterministic arithmetic so the operator can trust the
 * number without re-running the model.
 */

const STAGES = [
  "lead",
  "qualified",
  "demo_scheduled",
  "proposal_sent",
  "negotiation",
  "verbal_commit",
  "closed_won",
  "closed_lost",
] as const;

const DEFAULT_STAGE_PROB: Record<(typeof STAGES)[number], number> = {
  lead: 5,
  qualified: 15,
  demo_scheduled: 25,
  proposal_sent: 40,
  negotiation: 60,
  verbal_commit: 85,
  closed_won: 100,
  closed_lost: 0,
};

const MAX_DEALS = 500;

export const forecastPipelineTool: Tool = {
  name: "forecast_pipeline",
  description:
    "Compute a weighted pipeline forecast over a target window. Returns committed, bestCase, weighted, perStage breakdown, and whether the forecast clears the operator's quota + confidenceFloor.",
  parameters: {
    type: "object",
    properties: {
      windowDays: {
        type: "integer",
        description: "Days from now to include closes for. Default 90.",
        minimum: 1,
        maximum: 365,
      },
      quotaUsd: {
        type: "number",
        description: "Operator quota for the window (USD). Used for the confidence-vs-floor check.",
        minimum: 0,
      },
      confidenceFloorPct: {
        type: "integer",
        description: "Forecast confidence must clear this %. Default 75.",
        minimum: 1,
        maximum: 100,
      },
      commitConfidencePct: {
        type: "integer",
        description: "Deals at or above this confidence count as committed. Default 80.",
        minimum: 1,
        maximum: 100,
      },
      deals: {
        type: "array",
        description: "1-500 deal entries.",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            stage: { type: "string", enum: STAGES },
            arrUsd: { type: "number", minimum: 0 },
            expectedCloseIso: { type: "string" },
            confidence: { type: "integer", minimum: 0, maximum: 100 },
          },
        },
      },
    },
    required: ["deals"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const windowDays = Math.max(1, Math.min(365, Number(args.windowDays ?? 90)));
    const quotaUsd = Math.max(0, Number(args.quotaUsd ?? 0));
    const confidenceFloorPct = Math.max(
      1,
      Math.min(100, Number(args.confidenceFloorPct ?? 75)),
    );
    const commitConfidencePct = Math.max(
      1,
      Math.min(100, Number(args.commitConfidencePct ?? 80)),
    );
    const rawDeals = Array.isArray(args.deals)
      ? (args.deals as Array<Record<string, unknown>>)
      : [];

    if (rawDeals.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: "deals required (at least one entry).",
      };
    }
    if (rawDeals.length > MAX_DEALS) {
      return {
        ok: false,
        refused: true,
        reason: `deals too many (max ${MAX_DEALS}).`,
      };
    }

    const now = Date.now();
    const windowEnd = now + windowDays * 86400_000;

    type ProcessedDeal = {
      id: string;
      stage: (typeof STAGES)[number];
      arrUsd: number;
      expectedCloseAt: number;
      confidence: number;
      stageProbabilityPct: number;
      weightedUsd: number;
      inWindow: boolean;
      isCommitted: boolean;
    };

    const deals: ProcessedDeal[] = [];
    for (const d of rawDeals) {
      const id = String(d.id ?? "");
      const stage = String(d.stage ?? "lead");
      const arrUsd = Number(d.arrUsd ?? 0);
      const closeIso = String(d.expectedCloseIso ?? "");
      const confidence = Number(d.confidence ?? 50);
      if (!(STAGES as readonly string[]).includes(stage)) {
        return {
          ok: false,
          refused: true,
          reason: `Deal ${id || "<unknown>"} has invalid stage '${stage}'.`,
        };
      }
      const closeAt = Date.parse(closeIso);
      if (!Number.isFinite(closeAt)) {
        return {
          ok: false,
          refused: true,
          reason: `Deal ${id || "<unknown>"} has invalid expectedCloseIso.`,
        };
      }
      const stagePct = DEFAULT_STAGE_PROB[stage as (typeof STAGES)[number]];
      const combinedPct = (stagePct * confidence) / 100;
      deals.push({
        id,
        stage: stage as (typeof STAGES)[number],
        arrUsd: Math.max(0, arrUsd),
        expectedCloseAt: closeAt,
        confidence: Math.max(0, Math.min(100, confidence)),
        stageProbabilityPct: stagePct,
        weightedUsd: Math.round(arrUsd * (combinedPct / 100) * 100) / 100,
        inWindow: closeAt >= now && closeAt <= windowEnd,
        isCommitted:
          stage !== "closed_lost" &&
          confidence >= commitConfidencePct &&
          stagePct >= commitConfidencePct,
      });
    }

    const inWindow = deals.filter((d) => d.inWindow && d.stage !== "closed_lost");
    const bestCase = Math.round(
      inWindow.reduce((s, d) => s + d.arrUsd, 0) * 100,
    ) / 100;
    const weighted = Math.round(
      inWindow.reduce((s, d) => s + d.weightedUsd, 0) * 100,
    ) / 100;
    const committed = Math.round(
      inWindow.filter((d) => d.isCommitted).reduce((s, d) => s + d.arrUsd, 0) *
        100,
    ) / 100;

    const perStage: Record<string, { count: number; arrUsd: number; weightedUsd: number }> =
      {};
    for (const stage of STAGES) {
      const group = inWindow.filter((d) => d.stage === stage);
      perStage[stage] = {
        count: group.length,
        arrUsd: Math.round(group.reduce((s, d) => s + d.arrUsd, 0) * 100) / 100,
        weightedUsd:
          Math.round(group.reduce((s, d) => s + d.weightedUsd, 0) * 100) / 100,
      };
    }

    const confidencePctOfQuota =
      quotaUsd === 0 ? null : Number(((weighted / quotaUsd) * 100).toFixed(2));
    const confidenceVsFloor =
      confidencePctOfQuota === null
        ? null
        : confidencePctOfQuota >= confidenceFloorPct;

    await logSecurityEvent({
      kind: "sd.pipeline.forecast",
      tenantId: ctx.tenantId,
      payload: {
        subject: "sd.pipeline.forecast",
        dealCount: deals.length,
        inWindowCount: inWindow.length,
        weighted,
        committed,
        bestCase,
        confidencePctOfQuota,
        confidenceVsFloor,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        windowDays,
        quotaUsd,
        confidenceFloorPct,
        commitConfidencePct,
        dealsTotal: deals.length,
        inWindowCount: inWindow.length,
        bestCase,
        weighted,
        committed,
        confidencePctOfQuota,
        confidenceVsFloor,
        perStage,
        committedDealIds: inWindow
          .filter((d) => d.isCommitted)
          .map((d) => d.id),
      },
    };
  },
};
