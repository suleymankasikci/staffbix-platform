import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * score_partner_fit — combine deterministic hard-gate checks
 * (allowedTypes + minPartnerArrUsd + region) with an LLM scoring pass
 * for the soft factors (audience overlap, voice fit, ecosystem
 * complement).
 *
 * Output:
 *   - hardGateStatus: { allowedType, minArrCleared, regionAllowed,
 *       overallPass }
 *   - softScore: 0-100 (LLM)
 *   - finalScore: hardGateStatus.overallPass ? softScore : 0
 *   - recommendedAction: 'skip' | 'queue' | 'priority'
 *   - rationale, redFlags, openQuestions
 */

const MODEL = "gpt-4o-mini";

const PARTNER_TYPES = [
  "integration",
  "reseller",
  "agency",
  "affiliate",
  "strategic",
  "co_marketing",
] as const;

const MIN_PARTNER_BRIEF_LEN = 30;
const MAX_PARTNER_BRIEF_LEN = 3000;

export const scorePartnerFitTool: Tool = {
  name: "score_partner_fit",
  description:
    "Score a partner for fit. Hard gates first (type, ARR, region) — if any fail, finalScore is 0 regardless of soft factors. Soft scoring uses the LLM for audience / voice / ecosystem alignment.",
  parameters: {
    type: "object",
    properties: {
      partnerName: { type: "string" },
      partnerType: { type: "string", enum: PARTNER_TYPES },
      partnerArrUsd: {
        type: "number",
        description: "Reported ARR for the partner (USD). 0 if unknown.",
        minimum: 0,
      },
      partnerRegions: {
        type: "array",
        description: "Operating regions for the partner (ISO 2-letter or 'US-east', 'EU-DACH').",
        items: { type: "string" },
      },
      partnerBrief: {
        type: "string",
        description: "1-3 sentences about the partner — what they sell, audience, fit hypothesis.",
      },
      allowedPartnerTypes: {
        type: "array",
        description: "Operator-allowed partner types. Defaults to all if empty.",
        items: { type: "string", enum: PARTNER_TYPES },
      },
      minPartnerArrUsd: {
        type: "number",
        description: "Minimum partner ARR to consider. Default 1,000,000.",
        minimum: 0,
      },
      requiredRegions: {
        type: "array",
        description:
          "If supplied, partner must operate in at least one of these. Empty = any region accepted.",
        items: { type: "string" },
      },
    },
    required: ["partnerName", "partnerType", "partnerBrief"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const partnerName = String(args.partnerName).trim();
    const partnerType = String(args.partnerType);
    const partnerArrUsd = Math.max(0, Number(args.partnerArrUsd ?? 0));
    const partnerRegions = Array.isArray(args.partnerRegions)
      ? (args.partnerRegions as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 10)
      : [];
    const partnerBrief = String(args.partnerBrief).trim();
    const rawAllowedTypes = Array.isArray(args.allowedPartnerTypes)
      ? (args.allowedPartnerTypes as string[])
      : [];
    const allowedPartnerTypes = rawAllowedTypes
      .filter((p) => (PARTNER_TYPES as readonly string[]).includes(p))
      .slice(0, 6);
    const minPartnerArrUsd = Math.max(
      0,
      Number(args.minPartnerArrUsd ?? 1_000_000),
    );
    const requiredRegions = Array.isArray(args.requiredRegions)
      ? (args.requiredRegions as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 10)
      : [];

    if (!(PARTNER_TYPES as readonly string[]).includes(partnerType)) {
      return {
        ok: false,
        refused: true,
        reason: `partnerType must be one of: ${PARTNER_TYPES.join(", ")}`,
      };
    }
    if (partnerName.length < 2) {
      return { ok: false, refused: true, reason: "partnerName too short." };
    }
    if (partnerBrief.length < MIN_PARTNER_BRIEF_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `partnerBrief too short (need ≥${MIN_PARTNER_BRIEF_LEN} chars).`,
      };
    }
    if (partnerBrief.length > MAX_PARTNER_BRIEF_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `partnerBrief too long (max ${MAX_PARTNER_BRIEF_LEN} chars).`,
      };
    }
    if (rawAllowedTypes.length > 0 && allowedPartnerTypes.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: `allowedPartnerTypes must be a subset of: ${PARTNER_TYPES.join(", ")}`,
      };
    }

    // Hard gates
    const allowedType =
      allowedPartnerTypes.length === 0 ||
      allowedPartnerTypes.includes(partnerType as (typeof PARTNER_TYPES)[number]);
    const minArrCleared = partnerArrUsd >= minPartnerArrUsd;
    const regionAllowed =
      requiredRegions.length === 0 ||
      partnerRegions.some((r) => requiredRegions.includes(r));
    const overallPass = allowedType && minArrCleared && regionAllowed;

    // Soft scoring via LLM only if hard gates pass; otherwise short-
    // circuit to save tokens.
    let softScore = 0;
    let rationale = "";
    let redFlags: string[] = [];
    let openQuestions: string[] = [];

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `partnership ${partnerType} ecosystem voice`.slice(0, 200),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });

    if (overallPass) {
      const bbBlock =
        hits.length > 0
          ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
          : "(no Brand Bible matches)";

      const systemPrompt = [
        "You are the Partnership Manager scoring soft fit factors (audience overlap, voice fit, ecosystem complement).",
        "Output STRICT JSON: { softScore, rationale, redFlags, openQuestions }.",
        "softScore: integer 0-100. Be honest — reserve 80+ for genuinely strong fits.",
        "rationale: 1-2 sentences explaining the score.",
        "redFlags: 0-3 strings.",
        "openQuestions: 1-3 strings the operator should answer before reaching out.",
        "ABSOLUTE RULES:",
        "  - NEVER invent partner metrics or claim relationships.",
        "Brand Bible context:",
        bbBlock,
      ].join("\n");

      const t0 = Date.now();
      try {
        const res = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `partnerName: ${partnerName}\npartnerType: ${partnerType}\npartnerRegions: ${partnerRegions.join(", ")}\n\n${partnerBrief}`,
            },
          ],
          max_tokens: 600,
          temperature: 0.25,
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
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const rawSoft = Number(parsed.softScore);
        softScore = Number.isFinite(rawSoft)
          ? Math.max(0, Math.min(100, Math.round(rawSoft)))
          : 0;
        rationale =
          typeof parsed.rationale === "string" ? parsed.rationale : "";
        redFlags = Array.isArray(parsed.redFlags)
          ? (parsed.redFlags as string[])
          : [];
        openQuestions = Array.isArray(parsed.openQuestions)
          ? (parsed.openQuestions as string[])
          : [];
      } catch (err) {
        return {
          ok: false,
          refused: true,
          reason: `Partner soft scoring failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    } else {
      rationale = [
        !allowedType ? `partnerType '${partnerType}' not in operator's allowed list` : "",
        !minArrCleared
          ? `partnerArrUsd (${partnerArrUsd}) below minPartnerArrUsd (${minPartnerArrUsd})`
          : "",
        !regionAllowed
          ? `partner regions (${partnerRegions.join(", ") || "none"}) don't intersect requiredRegions (${requiredRegions.join(", ")})`
          : "",
      ]
        .filter((s) => s.length > 0)
        .join("; ");
    }

    const finalScore = overallPass ? softScore : 0;
    const recommendedAction = !overallPass
      ? "skip"
      : finalScore >= 75
        ? "priority"
        : finalScore >= 50
          ? "queue"
          : "skip";

    await logSecurityEvent({
      kind: "partnership.partner.scored",
      tenantId: ctx.tenantId,
      payload: {
        subject: "partnership.partner.scored",
        partnerName,
        partnerType,
        overallPass,
        softScore,
        finalScore,
        recommendedAction,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        partnerName,
        partnerType,
        hardGateStatus: {
          allowedType,
          minArrCleared,
          regionAllowed,
          overallPass,
        },
        softScore,
        finalScore,
        recommendedAction,
        rationale,
        redFlags,
        openQuestions,
        brandBibleChunkIds: hits.map((h) => h.chunkId),
      },
    };
  },
};
