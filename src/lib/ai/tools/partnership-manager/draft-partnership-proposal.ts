import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * draft_partnership_proposal — produce a joint-GTM proposal for a
 * partner. Output JSON:
 *   - whyNow: 1-2 sentences
 *   - jointValue: 2-3 paragraphs covering joint customer benefit
 *   - coMarketingMotion: array of activities with delivery + timeline
 *   - successMetrics: 3-5 verifiable metrics
 *   - openQuestions: 2-5 strings
 *   - financialModelPlaceholder: literal placeholder (no numbers)
 */

const MODEL = "gpt-4o-mini";

const PARTNERSHIP_TYPES = [
  "integration",
  "reseller",
  "agency_referral",
  "affiliate",
  "strategic",
  "co_marketing",
] as const;

const MIN_BRIEF_LEN = 30;
const MAX_BRIEF_LEN = 4000;

export const draftPartnershipProposalTool: Tool = {
  name: "draft_partnership_proposal",
  description:
    "Draft a structured joint-GTM partnership proposal (whyNow, jointValue, coMarketingMotion, successMetrics, openQuestions). Financial terms are intentionally a placeholder — operator owns the deal economics.",
  parameters: {
    type: "object",
    properties: {
      partnerName: { type: "string" },
      partnershipType: { type: "string", enum: PARTNERSHIP_TYPES },
      partnerOfferings: {
        type: "string",
        description:
          "What the partner sells / does. 1-3 sentences. The model uses this verbatim — no invention.",
      },
      operatorValueProp: {
        type: "string",
        description: "Operator's one-line value proposition (used verbatim).",
      },
      targetJointCustomers: {
        type: "array",
        description: "1-5 entries describing target joint customer segments.",
        items: { type: "string" },
      },
      activitiesShortlist: {
        type: "array",
        description:
          "Operator-suggested co-marketing activities to consider (webinar, case study, joint blog, etc.). The tool MAY add more.",
        items: { type: "string" },
      },
    },
    required: [
      "partnerName",
      "partnershipType",
      "partnerOfferings",
      "operatorValueProp",
      "targetJointCustomers",
    ],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const partnerName = String(args.partnerName).trim();
    const partnershipType = String(args.partnershipType);
    const partnerOfferings = String(args.partnerOfferings).trim();
    const operatorValueProp = String(args.operatorValueProp).trim();
    const targetJointCustomers = Array.isArray(args.targetJointCustomers)
      ? (args.targetJointCustomers as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 5)
      : [];
    const activitiesShortlist = Array.isArray(args.activitiesShortlist)
      ? (args.activitiesShortlist as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 10)
      : [];

    if (!(PARTNERSHIP_TYPES as readonly string[]).includes(partnershipType)) {
      return {
        ok: false,
        refused: true,
        reason: `partnershipType must be one of: ${PARTNERSHIP_TYPES.join(", ")}`,
      };
    }
    if (partnerName.length < 2) {
      return { ok: false, refused: true, reason: "partnerName too short." };
    }
    if (partnerOfferings.length < MIN_BRIEF_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `partnerOfferings too short (need ≥${MIN_BRIEF_LEN} chars).`,
      };
    }
    if (partnerOfferings.length > MAX_BRIEF_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `partnerOfferings too long (max ${MAX_BRIEF_LEN} chars).`,
      };
    }
    if (operatorValueProp.length < 10) {
      return {
        ok: false,
        refused: true,
        reason: "operatorValueProp too short.",
      };
    }
    if (targetJointCustomers.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: "targetJointCustomers required (at least one).",
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `partnership ${partnershipType} value prop joint GTM`.slice(0, 200),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const systemPrompt = [
      "You are the Partnership Manager drafting a joint-GTM proposal.",
      "Output STRICT JSON: { whyNow, jointValue, coMarketingMotion, successMetrics, openQuestions, financialModelPlaceholder }.",
      "whyNow: 1-2 sentences — why this partnership, now.",
      "jointValue: 2-3 paragraphs (≤250 words total) describing joint customer benefit.",
      "coMarketingMotion: 3-6 entries of { activity, ownedBy ('vendor' | 'partner' | 'shared'), targetWeek }.",
      "successMetrics: 3-5 verifiable metrics (e.g., 'joint pipeline ARR within 6 months').",
      "openQuestions: 2-5 strings the operator must answer.",
      "financialModelPlaceholder: literal '[FINANCIAL TERMS — operator to confirm]'. NEVER include numbers.",
      "ABSOLUTE RULES:",
      "  - NEVER invent partner case studies / metrics.",
      "  - NEVER commit to revenue splits, MDF, or rebates.",
      `partnerName: ${partnerName}`,
      `partnershipType: ${partnershipType}`,
      `operatorValueProp: ${operatorValueProp}`,
      `targetJointCustomers: ${targetJointCustomers.join(" | ")}`,
      activitiesShortlist.length > 0
        ? `activitiesShortlist: ${activitiesShortlist.join(" | ")}`
        : "",
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
          { role: "user", content: partnerOfferings },
        ],
        max_tokens: 1500,
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

      const motion = Array.isArray(parsed.coMarketingMotion)
        ? (parsed.coMarketingMotion as Array<Record<string, unknown>>).map(
            (a) => ({
              activity: typeof a.activity === "string" ? a.activity : "",
              ownedBy:
                typeof a.ownedBy === "string" &&
                ["vendor", "partner", "shared"].includes(a.ownedBy as string)
                  ? (a.ownedBy as string)
                  : "shared",
              targetWeek:
                typeof a.targetWeek === "number" && Number.isInteger(a.targetWeek)
                  ? Math.max(1, Math.min(52, a.targetWeek as number))
                  : 0,
            }),
          )
        : [];

      await logSecurityEvent({
        kind: "partnership.proposal.drafted",
        tenantId: ctx.tenantId,
        payload: {
          subject: "partnership.proposal.drafted",
          partnerName,
          partnershipType,
          activitiesCount: motion.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          partnerName,
          partnershipType,
          whyNow: typeof parsed.whyNow === "string" ? parsed.whyNow : "",
          jointValue:
            typeof parsed.jointValue === "string" ? parsed.jointValue : "",
          coMarketingMotion: motion,
          successMetrics: Array.isArray(parsed.successMetrics)
            ? (parsed.successMetrics as string[])
            : [],
          openQuestions: Array.isArray(parsed.openQuestions)
            ? (parsed.openQuestions as string[])
            : [],
          financialModelPlaceholder: "[FINANCIAL TERMS — operator to confirm]",
          notForCommitment:
            "Proposal only. Operator owns revenue splits / MDF / rebates / contract terms.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Partnership proposal failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
