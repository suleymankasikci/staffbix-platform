import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * review_channel_mix — given current spend + ROAS per channel, flag
 * underperformers (below minRoasThreshold for the configured window)
 * and propose a reallocation. Pure arithmetic — deterministic.
 *
 * Output:
 *   - perChannel: [{ channel, spendUsd, roas, status, weeksBelowThreshold }]
 *   - underperformers, topPerformers
 *   - reallocation: array of { fromChannel, toChannel, amountUsd, rationale }
 *   - totalSpendUsd, weightedAvgRoas
 *   - holdSpendWarning: true if no channel clears threshold
 */

type ChannelStatus = "star" | "ok" | "watch" | "cut";

const MAX_CHANNELS = 12;

export const reviewChannelMixTool: Tool = {
  name: "review_channel_mix",
  description:
    "Review marketing channel spend vs ROAS, classify each channel, and propose budget reallocation from underperformers (below minRoasThreshold for daysBelowThresholdToCut days) to top performers. Pure arithmetic — no LLM.",
  parameters: {
    type: "object",
    properties: {
      channels: {
        type: "array",
        description:
          "Per-channel spend + ROAS. 1-12 entries. Each entry: { channel: string, spendUsd: number, roas: number, weeksBelowThreshold?: int }.",
        items: {
          type: "object",
          properties: {
            channel: { type: "string" },
            spendUsd: { type: "number", minimum: 0 },
            roas: { type: "number", minimum: 0 },
            weeksBelowThreshold: { type: "integer", minimum: 0 },
          },
        },
      },
      minRoasThreshold: {
        type: "number",
        description: "Below this is 'underperforming'. Default 1.5.",
        minimum: 0,
        maximum: 100,
      },
      starRoasThreshold: {
        type: "number",
        description: "At or above this is 'star'. Default 3.0.",
        minimum: 0,
        maximum: 100,
      },
      weeksBelowToCut: {
        type: "integer",
        description: "Cut after this many consecutive weeks below threshold. Default 4.",
        minimum: 1,
        maximum: 52,
      },
      cutReallocationPct: {
        type: "integer",
        description: "% of an underperformer's spend to reallocate. Default 50.",
        minimum: 1,
        maximum: 100,
      },
    },
    required: ["channels"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const rawChannels = Array.isArray(args.channels)
      ? (args.channels as Array<Record<string, unknown>>)
      : [];
    const minRoas = Math.max(0, Math.min(100, Number(args.minRoasThreshold ?? 1.5)));
    const starRoas = Math.max(0, Math.min(100, Number(args.starRoasThreshold ?? 3.0)));
    const weeksBelowToCut = Math.max(
      1,
      Math.min(52, Number(args.weeksBelowToCut ?? 4)),
    );
    const cutReallocationPct = Math.max(
      1,
      Math.min(100, Number(args.cutReallocationPct ?? 50)),
    );

    if (rawChannels.length === 0) {
      return { ok: false, refused: true, reason: "channels required (at least one entry)." };
    }
    if (rawChannels.length > MAX_CHANNELS) {
      return {
        ok: false,
        refused: true,
        reason: `channels too many (max ${MAX_CHANNELS}).`,
      };
    }
    if (starRoas <= minRoas) {
      return {
        ok: false,
        refused: true,
        reason: "starRoasThreshold must be > minRoasThreshold.",
      };
    }

    const channels = rawChannels.map((c) => {
      const name = String(c.channel ?? "").trim();
      const spendUsd = Number(c.spendUsd);
      const roas = Number(c.roas);
      const weeksBelow = Number(c.weeksBelowThreshold ?? 0);
      let status: ChannelStatus = "ok";
      if (Number.isFinite(roas)) {
        if (roas >= starRoas) status = "star";
        else if (roas < minRoas && weeksBelow >= weeksBelowToCut) status = "cut";
        else if (roas < minRoas) status = "watch";
        else status = "ok";
      }
      return {
        channel: name,
        spendUsd: Number.isFinite(spendUsd) ? Math.round(spendUsd * 100) / 100 : 0,
        roas: Number.isFinite(roas) ? Number(roas.toFixed(2)) : 0,
        weeksBelowThreshold: Number.isFinite(weeksBelow) ? Math.max(0, weeksBelow) : 0,
        status,
      };
    });

    // Validate that no channel name is blank.
    if (channels.some((c) => c.channel.length === 0)) {
      return {
        ok: false,
        refused: true,
        reason: "Every channel entry needs a non-empty channel name.",
      };
    }

    const totalSpendUsd = channels.reduce((s, c) => s + c.spendUsd, 0);
    const weightedRoas =
      totalSpendUsd === 0
        ? 0
        : channels.reduce((s, c) => s + c.spendUsd * c.roas, 0) / totalSpendUsd;
    const weightedAvgRoas = Number(weightedRoas.toFixed(2));

    const stars = channels.filter((c) => c.status === "star");
    const cuts = channels.filter((c) => c.status === "cut");
    const watches = channels.filter((c) => c.status === "watch");

    // Reallocation: pull cutReallocationPct% of each "cut" channel's
    // spend, distribute evenly to "star" channels. If no stars exist,
    // hold the money (holdSpendWarning).
    const reallocation: Array<{
      fromChannel: string;
      toChannel: string | null;
      amountUsd: number;
      rationale: string;
    }> = [];
    const holdSpendWarning = cuts.length > 0 && stars.length === 0;

    if (cuts.length > 0 && stars.length > 0) {
      for (const c of cuts) {
        const cutAmount = Math.round((c.spendUsd * cutReallocationPct) / 100 * 100) / 100;
        const perStar = Math.round((cutAmount / stars.length) * 100) / 100;
        for (const s of stars) {
          if (perStar < 0.01) continue;
          reallocation.push({
            fromChannel: c.channel,
            toChannel: s.channel,
            amountUsd: perStar,
            rationale: `${c.channel} ROAS ${c.roas} below ${minRoas} for ${c.weeksBelowThreshold}w; redirect to ${s.channel} (ROAS ${s.roas}).`,
          });
        }
      }
    } else if (holdSpendWarning) {
      for (const c of cuts) {
        const cutAmount = Math.round((c.spendUsd * cutReallocationPct) / 100 * 100) / 100;
        reallocation.push({
          fromChannel: c.channel,
          toChannel: null,
          amountUsd: cutAmount,
          rationale: `${c.channel} below threshold but no star channel to absorb spend — hold the money.`,
        });
      }
    }

    await logSecurityEvent({
      kind: "md.channel.reviewed",
      tenantId: ctx.tenantId,
      payload: {
        subject: "md.channel.reviewed",
        channelCount: channels.length,
        totalSpendUsd,
        weightedAvgRoas,
        cutsCount: cuts.length,
        starsCount: stars.length,
        holdSpendWarning,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        minRoasThreshold: minRoas,
        starRoasThreshold: starRoas,
        weeksBelowToCut,
        cutReallocationPct,
        perChannel: channels,
        totalSpendUsd: Math.round(totalSpendUsd * 100) / 100,
        weightedAvgRoas,
        topPerformers: stars.map((s) => s.channel),
        underperformers: [...cuts, ...watches].map((c) => ({
          channel: c.channel,
          status: c.status,
          roas: c.roas,
          weeksBelowThreshold: c.weeksBelowThreshold,
        })),
        reallocation,
        holdSpendWarning,
      },
    };
  },
};
