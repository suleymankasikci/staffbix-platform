import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * draft_renegotiation_brief — produce a structured negotiation brief
 * for an upcoming vendor renewal / re-pricing conversation.
 *
 * Output JSON:
 *   - headline: 1 line summary
 *   - asks: 2-4 specific asks (rate, terms, SLAs)
 *   - talkingPoints: 3-6 strings with evidence
 *   - alternativesBATNA: 1-3 strings — what we do if they say no
 *   - walkAwayThreshold: 1-2 sentences — the line we won't cross
 *   - openQuestions: 2-4 strings to verify before the meeting
 *   - tone: 'cooperative' | 'firm' | 'last_resort'
 *   - confidence
 */

const MODEL = "gpt-4o-mini";

type Tone = "cooperative" | "firm" | "last_resort";
const RELATIONSHIP_HEALTH = ["strong", "neutral", "rocky"] as const;

const MIN_CONTEXT_LEN = 30;
const MAX_CONTEXT_LEN = 3000;
const MAX_RATE_RISE_PCT = 200; // sanity cap — rises > 200% likely typo

export const draftRenegotiationBriefTool: Tool = {
  name: "draft_renegotiation_brief",
  description:
    "Draft a vendor renegotiation brief (headline, asks, talking points, BATNA, walk-away threshold, open questions). Tone is set by walkAwayThresholdPct + relationshipHealth.",
  parameters: {
    type: "object",
    properties: {
      vendorName: { type: "string" },
      currentRateLabel: {
        type: "string",
        description: "Operator-supplied current rate label (e.g., '$45/hr', '$12k/mo'). Used verbatim.",
      },
      proposedRateRisePct: {
        type: "number",
        description: "What rate rise the vendor proposed (%). 0 if no rise.",
        minimum: 0,
        maximum: MAX_RATE_RISE_PCT,
      },
      walkAwayThresholdPct: {
        type: "number",
        description: "Max rise % we're willing to absorb. Default 10.",
        minimum: 0,
        maximum: 100,
      },
      relationshipHealth: { type: "string", enum: RELATIONSHIP_HEALTH },
      currentContext: {
        type: "string",
        description: "Current contract state, performance issues, leverage points. ≤3000 chars.",
      },
      knownAlternatives: {
        type: "array",
        description:
          "Operator-supplied alternatives (other vendors / in-house options). 0-5 entries.",
        items: { type: "string" },
      },
    },
    required: [
      "vendorName",
      "currentRateLabel",
      "proposedRateRisePct",
      "relationshipHealth",
      "currentContext",
    ],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const vendorName = String(args.vendorName).trim();
    const currentRateLabel = String(args.currentRateLabel).trim();
    const proposedRateRisePct = Math.max(
      0,
      Math.min(MAX_RATE_RISE_PCT, Number(args.proposedRateRisePct)),
    );
    const walkAwayThresholdPct = Math.max(
      0,
      Math.min(100, Number(args.walkAwayThresholdPct ?? 10)),
    );
    const relationshipHealth = String(args.relationshipHealth);
    const currentContext = String(args.currentContext).trim();
    const knownAlternatives = Array.isArray(args.knownAlternatives)
      ? (args.knownAlternatives as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 5)
      : [];

    if (vendorName.length < 2) {
      return { ok: false, refused: true, reason: "vendorName too short." };
    }
    if (currentRateLabel.length < 1) {
      return {
        ok: false,
        refused: true,
        reason: "currentRateLabel required.",
      };
    }
    if (
      !(RELATIONSHIP_HEALTH as readonly string[]).includes(relationshipHealth)
    ) {
      return {
        ok: false,
        refused: true,
        reason: `relationshipHealth must be one of: ${RELATIONSHIP_HEALTH.join(", ")}`,
      };
    }
    if (currentContext.length < MIN_CONTEXT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `currentContext too short (need ≥${MIN_CONTEXT_LEN} chars).`,
      };
    }
    if (currentContext.length > MAX_CONTEXT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `currentContext too long (max ${MAX_CONTEXT_LEN} chars).`,
      };
    }

    // Determine tone server-side based on signals.
    let tone: Tone;
    if (proposedRateRisePct <= walkAwayThresholdPct && relationshipHealth === "strong") {
      tone = "cooperative";
    } else if (proposedRateRisePct > walkAwayThresholdPct * 2 || relationshipHealth === "rocky") {
      tone = "last_resort";
    } else {
      tone = "firm";
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `vendor negotiation voice ${vendorName}`.slice(0, 200),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const toneClause: Record<Tone, string> = {
      cooperative:
        "Tone: cooperative. Lead with continued partnership; the asks are improvements, not threats.",
      firm: "Tone: firm. Honest but pointed; reference walk-away threshold without naming it.",
      last_resort:
        "Tone: last_resort. The relationship is at risk; the brief explicitly considers exit.",
    };

    const systemPrompt = [
      "You are the Vendor Manager preparing a negotiation brief.",
      "Output STRICT JSON: { headline, asks, talkingPoints, alternativesBATNA, walkAwayThreshold, openQuestions, confidence }.",
      "headline: 1 sentence — the situation in one line.",
      "asks: 2-4 strings. Each a specific operator ask (cap rate at X%, extend term, add SLA, etc.).",
      "talkingPoints: 3-6 strings backed by currentContext / Brand Bible.",
      "alternativesBATNA: 1-3 strings. Use operator knownAlternatives when supplied.",
      "walkAwayThreshold: 1-2 sentences — the line we won't cross. Reference walkAwayThresholdPct.",
      "openQuestions: 2-4 strings the operator should verify before the meeting.",
      "confidence: 'low' | 'medium' | 'high'.",
      toneClause[tone],
      `vendorName: ${vendorName}`,
      `currentRateLabel: ${currentRateLabel}`,
      `proposedRateRisePct: ${proposedRateRisePct}`,
      `walkAwayThresholdPct: ${walkAwayThresholdPct}`,
      `relationshipHealth: ${relationshipHealth}`,
      knownAlternatives.length > 0
        ? `knownAlternatives: ${knownAlternatives.join(" | ")}`
        : "",
      "ABSOLUTE RULES:",
      "  - NEVER invent competitive prices from named alternatives.",
      "  - NEVER promise terms outside the operator's authority.",
      "Brand Bible context:",
      bbBlock,
    ]
      .filter(Boolean)
      .join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: currentContext },
        ],
        max_tokens: 1100,
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
        kind: "vendor.renegotiation.drafted",
        tenantId: ctx.tenantId,
        payload: {
          subject: "vendor.renegotiation.drafted",
          vendorName,
          proposedRateRisePct,
          walkAwayThresholdPct,
          tone,
          relationshipHealth,
          alternativesCount: knownAlternatives.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          vendorName,
          currentRateLabel,
          proposedRateRisePct,
          walkAwayThresholdPct,
          relationshipHealth,
          tone,
          headline: typeof parsed.headline === "string" ? parsed.headline : "",
          asks: Array.isArray(parsed.asks) ? (parsed.asks as string[]) : [],
          talkingPoints: Array.isArray(parsed.talkingPoints)
            ? (parsed.talkingPoints as string[])
            : [],
          alternativesBATNA: Array.isArray(parsed.alternativesBATNA)
            ? (parsed.alternativesBATNA as string[])
            : knownAlternatives,
          walkAwayThreshold:
            typeof parsed.walkAwayThreshold === "string"
              ? parsed.walkAwayThreshold
              : "",
          openQuestions: Array.isArray(parsed.openQuestions)
            ? (parsed.openQuestions as string[])
            : [],
          confidence:
            typeof parsed.confidence === "string"
              ? (parsed.confidence as string)
              : "medium",
          notForCommitment:
            "Brief only. Operator owns the actual negotiation conversation.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Renegotiation brief failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
