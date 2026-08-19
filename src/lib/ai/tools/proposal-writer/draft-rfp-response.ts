import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * draft_rfp_response — produce a structured RFP response from the
 * prospect's brief + scope items + tone preference. Output JSON:
 *   - executiveSummary
 *   - sections: [{ title, body }]
 *   - scopeMatrix: [{ requirement, status, notes }]
 *     status ∈ 'met' | 'partial' | 'not_met' | 'requires_clarification'
 *   - caseStudyHints: 0-3 strings referencing the operator's library
 *   - assumptions, openQuestions
 *   - pricingDeferred: always true (Proposal Writer defers pricing)
 */

const MODEL = "gpt-4o-mini";

const TONES = ["formal", "conversational", "match_prospect"] as const;
const VERTICALS = [
  "saas",
  "ecommerce",
  "fintech",
  "healthtech",
  "manufacturing",
  "logistics",
  "retail",
  "education",
  "media",
  "other",
] as const;

const MIN_BRIEF_LEN = 60;
const MAX_BRIEF_LEN = 8000;

export const draftRfpResponseTool: Tool = {
  name: "draft_rfp_response",
  description:
    "Draft a structured RFP response (executive summary, sections, scope matrix, case-study hints, assumptions, open questions). pricingDeferred is ALWAYS true — operator owns pricing.",
  parameters: {
    type: "object",
    properties: {
      prospectName: { type: "string" },
      prospectVertical: { type: "string", enum: VERTICALS },
      rfpBrief: {
        type: "string",
        description: "The RFP scope + context. ≤8000 chars.",
      },
      scopeItems: {
        type: "array",
        description: "1-30 individual requirements from the RFP.",
        items: { type: "string" },
      },
      tone: { type: "string", enum: TONES },
      caseStudyTags: {
        type: "array",
        description:
          "Operator-supplied tags for which case studies to reference (e.g., 'retail-launch', 'EU-GDPR'). The tool surfaces the tags but never invents case studies.",
        items: { type: "string" },
      },
    },
    required: ["prospectName", "prospectVertical", "rfpBrief", "scopeItems", "tone"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const prospectName = String(args.prospectName).trim();
    const prospectVertical = String(args.prospectVertical);
    const rfpBrief = String(args.rfpBrief).trim();
    const scopeItems = Array.isArray(args.scopeItems)
      ? (args.scopeItems as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 30)
      : [];
    const tone = String(args.tone);
    const caseStudyTags = Array.isArray(args.caseStudyTags)
      ? (args.caseStudyTags as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 10)
      : [];

    if (!(VERTICALS as readonly string[]).includes(prospectVertical)) {
      return {
        ok: false,
        refused: true,
        reason: `prospectVertical must be one of: ${VERTICALS.join(", ")}`,
      };
    }
    if (!(TONES as readonly string[]).includes(tone)) {
      return {
        ok: false,
        refused: true,
        reason: `tone must be one of: ${TONES.join(", ")}`,
      };
    }
    if (prospectName.length < 2) {
      return { ok: false, refused: true, reason: "prospectName too short." };
    }
    if (rfpBrief.length < MIN_BRIEF_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `rfpBrief too short (need ≥${MIN_BRIEF_LEN} chars).`,
      };
    }
    if (rfpBrief.length > MAX_BRIEF_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `rfpBrief too long (max ${MAX_BRIEF_LEN} chars).`,
      };
    }
    if (scopeItems.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: "scopeItems required (at least one).",
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `${prospectVertical} ${caseStudyTags.join(" ")} proposal voice`.slice(0, 300),
      k: 4,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const toneClause: Record<(typeof TONES)[number], string> = {
      formal: "Tone: formal. Third-person, precise vocabulary, full sentences.",
      conversational: "Tone: conversational. Second-person, contractions OK, plain words.",
      match_prospect:
        "Tone: mirror the prospect's tone from rfpBrief — match register, sentence length, and formality.",
    };

    const systemPrompt = [
      "You are the Proposal Writer drafting an RFP response for the operator.",
      "Output STRICT JSON: { executiveSummary, sections, scopeMatrix, caseStudyHints, assumptions, openQuestions, pricingDeferred }.",
      "executiveSummary: 2-4 sentences leading with prospect benefit.",
      "sections: 3-6 entries of { title, body }. Standard sections: Approach, Methodology, Team, Timeline, Differentiators.",
      "scopeMatrix: one entry per scopeItem with status ∈ 'met' | 'partial' | 'not_met' | 'requires_clarification'.",
      "caseStudyHints: 0-3 case studies the operator should attach — reference caseStudyTags or Brand Bible only.",
      "assumptions: 1-5 strings — what you assumed.",
      "openQuestions: 1-5 strings — what the operator needs the prospect to clarify.",
      "pricingDeferred: ALWAYS true. NEVER include pricing.",
      "ABSOLUTE RULES:",
      "  - NEVER invent customer logos / case studies.",
      "  - NEVER quote prices / discounts.",
      "  - NEVER promise SLAs not in Brand Bible.",
      toneClause[tone as (typeof TONES)[number]],
      `prospectName: ${prospectName}`,
      `prospectVertical: ${prospectVertical}`,
      caseStudyTags.length > 0
        ? `caseStudyTags: ${caseStudyTags.join(", ")}`
        : "",
      "scopeItems:",
      ...scopeItems.map((s, i) => `  [${i}] ${s}`),
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
          { role: "user", content: rfpBrief },
        ],
        max_tokens: 1800,
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

      const sections = Array.isArray(parsed.sections)
        ? (parsed.sections as Array<Record<string, unknown>>).map((s) => ({
            title: typeof s.title === "string" ? s.title : "",
            body: typeof s.body === "string" ? s.body : "",
          }))
        : [];
      const matrix = Array.isArray(parsed.scopeMatrix)
        ? (parsed.scopeMatrix as Array<Record<string, unknown>>).map((m) => ({
            requirement: typeof m.requirement === "string" ? m.requirement : "",
            status:
              typeof m.status === "string" &&
              ["met", "partial", "not_met", "requires_clarification"].includes(
                m.status as string,
              )
                ? (m.status as string)
                : "requires_clarification",
            notes: typeof m.notes === "string" ? m.notes : "",
          }))
        : [];

      await logSecurityEvent({
        kind: "proposal.rfp.drafted",
        tenantId: ctx.tenantId,
        payload: {
          subject: "proposal.rfp.drafted",
          prospectName,
          prospectVertical,
          scopeItemsCount: scopeItems.length,
          sectionsCount: sections.length,
          tone,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          prospectName,
          prospectVertical,
          tone,
          executiveSummary:
            typeof parsed.executiveSummary === "string"
              ? parsed.executiveSummary
              : "",
          sections,
          scopeMatrix: matrix,
          caseStudyHints: Array.isArray(parsed.caseStudyHints)
            ? (parsed.caseStudyHints as string[])
            : [],
          assumptions: Array.isArray(parsed.assumptions)
            ? (parsed.assumptions as string[])
            : [],
          openQuestions: Array.isArray(parsed.openQuestions)
            ? (parsed.openQuestions as string[])
            : [],
          pricingDeferred: true,
          notForSubmission:
            "Draft only. AM owns pricing; legal owns terms; operator owns final submission.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `RFP response failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
