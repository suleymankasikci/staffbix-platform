import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * forecast_demand — project next N weeks of demand for a SKU using a
 * rolling-average + linear-trend model. Pure arithmetic. The forecast
 * is conservative: we cap the trend slope contribution at ±40% per
 * week to avoid runaway extrapolation.
 *
 * Output:
 *   - rollingAverage: avg of last N weeks
 *   - trendUnitsPerWeek: simple linear slope across history
 *   - perWeek: [{ week, baseline, trendAdjustment, seasonalAdjustment,
 *     forecastUnits, lowerBound, upperBound }]
 *   - totalForecastUnits
 *   - confidence: 'low' (sparse history) | 'medium' | 'high'
 */

const MIN_HISTORY_WEEKS = 4;
const MAX_HISTORY_WEEKS = 104;
const MIN_FORECAST_WEEKS = 1;
const MAX_FORECAST_WEEKS = 26;

const TREND_CAP_PCT = 40; // ±40% per week on the trend contribution

export const forecastDemandTool: Tool = {
  name: "forecast_demand",
  description:
    "Forecast next N weeks of demand for a SKU using rolling average + linear trend (capped). Optional weekly seasonality multipliers. Pure arithmetic.",
  parameters: {
    type: "object",
    properties: {
      sku: { type: "string" },
      weeklyHistoryUnits: {
        type: "array",
        description:
          "Weekly unit sales, oldest → newest. 4-104 entries.",
        items: { type: "integer", minimum: 0 },
      },
      forecastWeeks: {
        type: "integer",
        description: "Weeks to forecast. 1-26. Default 8.",
        minimum: MIN_FORECAST_WEEKS,
        maximum: MAX_FORECAST_WEEKS,
      },
      seasonalityMultipliers: {
        type: "array",
        description:
          "Optional 1.0-centred multipliers, one per forecast week (e.g., 1.4 for peak season). Length should equal forecastWeeks.",
        items: { type: "number", minimum: 0, maximum: 5 },
      },
      includeBounds: {
        type: "boolean",
        description:
          "If true, include lowerBound (-15%) and upperBound (+15%) per week. Default true.",
      },
    },
    required: ["sku", "weeklyHistoryUnits"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const sku = String(args.sku).trim();
    const rawHistory = Array.isArray(args.weeklyHistoryUnits)
      ? (args.weeklyHistoryUnits as number[])
      : [];
    const history = rawHistory
      .map((n) => Math.max(0, Math.round(Number(n))))
      .filter((n) => Number.isFinite(n));
    const forecastWeeks = Math.max(
      MIN_FORECAST_WEEKS,
      Math.min(MAX_FORECAST_WEEKS, Math.round(Number(args.forecastWeeks ?? 8))),
    );
    const rawSeasonality = Array.isArray(args.seasonalityMultipliers)
      ? (args.seasonalityMultipliers as number[])
      : [];
    const seasonality = rawSeasonality
      .map((n) => Math.max(0, Math.min(5, Number(n))))
      .filter((n) => Number.isFinite(n));
    const includeBounds =
      args.includeBounds === undefined ? true : Boolean(args.includeBounds);

    if (sku.length < 1) {
      return { ok: false, refused: true, reason: "sku required." };
    }
    if (history.length < MIN_HISTORY_WEEKS) {
      return {
        ok: false,
        refused: true,
        reason: `weeklyHistoryUnits must have ≥${MIN_HISTORY_WEEKS} weeks.`,
      };
    }
    if (history.length > MAX_HISTORY_WEEKS) {
      return {
        ok: false,
        refused: true,
        reason: `weeklyHistoryUnits too long (max ${MAX_HISTORY_WEEKS}).`,
      };
    }
    if (seasonality.length > 0 && seasonality.length !== forecastWeeks) {
      return {
        ok: false,
        refused: true,
        reason: `seasonalityMultipliers length (${seasonality.length}) must equal forecastWeeks (${forecastWeeks}).`,
      };
    }

    const rollingAverage =
      history.reduce((s, n) => s + n, 0) / history.length;

    // Simple linear regression: y = a + b*x where x is week index.
    // Solve least squares directly.
    const n = history.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += history[i];
      sumXY += i * history[i];
      sumXX += i * i;
    }
    const denom = n * sumXX - sumX * sumX;
    const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;

    // Cap the slope contribution to ±TREND_CAP_PCT% of the rolling
    // average per forecast week to avoid runaway extrapolation.
    const maxTrendPerWeek =
      (TREND_CAP_PCT / 100) * Math.max(rollingAverage, 1);
    const cappedSlope = Math.max(
      -maxTrendPerWeek,
      Math.min(maxTrendPerWeek, slope),
    );

    const perWeek = Array.from({ length: forecastWeeks }, (_, i) => {
      const baseline = rollingAverage;
      const trendAdjustment = cappedSlope * (i + 1);
      const seasonalMultiplier =
        seasonality.length > 0 ? seasonality[i] : 1;
      const seasonalAdjustment =
        (baseline + trendAdjustment) * (seasonalMultiplier - 1);
      const raw = baseline + trendAdjustment + seasonalAdjustment;
      const forecastUnits = Math.max(0, Math.round(raw));
      const lowerBound = includeBounds
        ? Math.max(0, Math.round(raw * 0.85))
        : forecastUnits;
      const upperBound = includeBounds
        ? Math.max(0, Math.round(raw * 1.15))
        : forecastUnits;
      return {
        week: i + 1,
        baseline: Number(baseline.toFixed(2)),
        trendAdjustment: Number(trendAdjustment.toFixed(2)),
        seasonalMultiplier,
        seasonalAdjustment: Number(seasonalAdjustment.toFixed(2)),
        forecastUnits,
        lowerBound,
        upperBound,
      };
    });

    const totalForecastUnits = perWeek.reduce(
      (s, w) => s + w.forecastUnits,
      0,
    );

    const confidence: "low" | "medium" | "high" =
      history.length < 8 ? "low" : history.length < 26 ? "medium" : "high";

    await logSecurityEvent({
      kind: "inventory.demand.forecast",
      tenantId: ctx.tenantId,
      payload: {
        subject: "inventory.demand.forecast",
        sku,
        historyWeeks: history.length,
        forecastWeeks,
        rollingAverage: Number(rollingAverage.toFixed(2)),
        slope: Number(slope.toFixed(3)),
        cappedSlope: Number(cappedSlope.toFixed(3)),
        totalForecastUnits,
        confidence,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        sku,
        historyWeeks: history.length,
        rollingAverage: Number(rollingAverage.toFixed(2)),
        rawSlope: Number(slope.toFixed(3)),
        cappedSlope: Number(cappedSlope.toFixed(3)),
        trendCapPct: TREND_CAP_PCT,
        forecastWeeks,
        perWeek,
        totalForecastUnits,
        confidence,
      },
    };
  },
};
