import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * check_anchor_diversity — given the list of anchor texts already
 * used in recent outreach + a candidate anchor for the next pitch,
 * decide whether using it would drag anchor-text diversity below the
 * operator-configured floor (default 70%).
 *
 * Diversity ratio = (count of distinct anchors / total anchors) × 100.
 * If adding the candidate keeps the ratio at or above the floor we
 * approve; otherwise we suggest alternative variants.
 *
 * No LLM call needed — pure arithmetic. The model uses this BEFORE
 * sending an anchor to a publisher, so the build profile stays
 * Google-safe.
 */

const MAX_RECENT = 200;
const ANCHOR_TYPES = [
  "branded",
  "exact_match",
  "partial_match",
  "topical",
  "url",
  "generic",
] as const;

export const checkAnchorDiversityTool: Tool = {
  name: "check_anchor_diversity",
  description:
    "Given the operator's recent backlink anchor texts and a proposed next anchor, return whether using it keeps anchor-text diversity at or above the floor. Pure arithmetic, no LLM. Always run BEFORE asking a publisher to use an anchor.",
  parameters: {
    type: "object",
    properties: {
      recentAnchors: {
        type: "array",
        description: "Last N anchors used. Order doesn't matter. ≤200 entries.",
        items: { type: "string" },
      },
      candidateAnchor: {
        type: "string",
        description: "The anchor you want to use next. ≤120 chars.",
      },
      candidateType: {
        type: "string",
        enum: ANCHOR_TYPES,
        description:
          "Optional classification: branded, exact_match, partial_match, topical, url, generic. Helps the report distinguish 'safe' types.",
      },
      diversityFloorPct: {
        type: "integer",
        description: "Minimum diversity ratio after this anchor. Default 70.",
        minimum: 10,
        maximum: 100,
      },
    },
    required: ["recentAnchors", "candidateAnchor"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const recentRaw = Array.isArray(args.recentAnchors)
      ? (args.recentAnchors as string[])
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter((s) => s.length > 0)
      : [];
    const recentAnchors = recentRaw.slice(-MAX_RECENT);
    const candidateAnchor = String(args.candidateAnchor).trim();
    const candidateType = args.candidateType ? String(args.candidateType) : "";
    const diversityFloorPct = Math.max(
      10,
      Math.min(100, Number(args.diversityFloorPct ?? 70)),
    );

    if (candidateAnchor.length < 1 || candidateAnchor.length > 120) {
      return {
        ok: false,
        refused: true,
        reason: "candidateAnchor must be 1-120 chars.",
      };
    }
    if (
      candidateType &&
      !(ANCHOR_TYPES as readonly string[]).includes(candidateType)
    ) {
      return {
        ok: false,
        refused: true,
        reason: `candidateType must be one of: ${ANCHOR_TYPES.join(", ")}`,
      };
    }
    if (recentRaw.length === 0) {
      // Empty history is OK — first anchor by definition is 100%
      // diverse.
      return {
        ok: true,
        data: {
          approved: true,
          beforeDiversityPct: 100,
          afterDiversityPct: 100,
          diversityFloorPct,
          candidateOverusedCount: 0,
          suggestedAlternatives: [],
          note: "Empty anchor history — first anchor is trivially diverse.",
        },
      };
    }

    const before = computeDiversity(recentAnchors);
    const projected = [...recentAnchors, candidateAnchor];
    const after = computeDiversity(projected);
    const candidateOverusedCount = recentAnchors.filter(
      (a) => a.toLowerCase() === candidateAnchor.toLowerCase(),
    ).length;
    const approved = after.diversityPct >= diversityFloorPct;

    let suggestedAlternatives: string[] = [];
    if (!approved) {
      // Suggest 3 anchor types that are currently UNDER-represented
      // relative to ideal balance. Cheap heuristic; the operator can
      // ignore and craft their own.
      const buckets = bucketize(recentAnchors);
      const under = Object.entries(buckets)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
        .map(([k]) => k);
      suggestedAlternatives = under;
    }

    await logSecurityEvent({
      kind: "backlink.diversity.checked",
      tenantId: ctx.tenantId,
      payload: {
        subject: "backlink.diversity.checked",
        candidatePreview: candidateAnchor.slice(0, 80),
        candidateType: candidateType || null,
        beforeDiversityPct: before.diversityPct,
        afterDiversityPct: after.diversityPct,
        diversityFloorPct,
        approved,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        approved,
        beforeDiversityPct: before.diversityPct,
        afterDiversityPct: after.diversityPct,
        beforeDistinctAnchors: before.distinct,
        afterDistinctAnchors: after.distinct,
        totalRecentAnchors: recentAnchors.length,
        diversityFloorPct,
        candidateOverusedCount,
        suggestedAlternatives,
      },
    };
  },
};

function computeDiversity(anchors: string[]): { distinct: number; diversityPct: number } {
  const distinct = new Set(anchors.map((a) => a.toLowerCase())).size;
  const total = anchors.length;
  const diversityPct =
    total === 0 ? 100 : Number(((distinct / total) * 100).toFixed(2));
  return { distinct, diversityPct };
}

function bucketize(anchors: string[]): Record<string, number> {
  const buckets: Record<string, number> = {
    branded: 0,
    exact_match: 0,
    partial_match: 0,
    topical: 0,
    url: 0,
    generic: 0,
  };
  for (const a of anchors) {
    if (/^https?:\/\//i.test(a) || /^www\./i.test(a)) buckets.url++;
    else if (/^(click here|read more|learn more|here|this)$/i.test(a))
      buckets.generic++;
    else buckets.topical++; // simple default; the operator's own tagger does better
  }
  return buckets;
}
