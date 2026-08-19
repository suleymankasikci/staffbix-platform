import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * answer_technical_question — produce a structured answer for a
 * technical buyer's question. The Sales Engineer ALWAYS:
 *   - defers pricing/contract questions to AM
 *   - flags anything outside the playbook in deferToHumanOn[]
 *   - lists explicit assumptions made
 *
 * Output JSON:
 *   - answer: ≤300 words
 *   - confidence: 'low' | 'medium' | 'high'
 *   - assumptions: 0-5 strings
 *   - deferToHumanOn: array of topics outside the SE scope
 *   - pricingDeferred: boolean — true when the question touches money
 *   - relatedDocsHint: 1 sentence hinting at the canonical doc URL
 */

const MODEL = "gpt-4o-mini";

const AUDIENCE_TIERS = [
  "engineer_individual",
  "engineer_lead",
  "engineering_director",
  "cto",
  "non_technical_decision_maker",
] as const;

const MIN_Q_LEN = 10;
const MAX_Q_LEN = 2000;
const MAX_CONTEXT_LEN = 4000;

const PRICING_PATTERNS = [
  /\bpric(?:e|ing)\b/i,
  /\bquote\b/i,
  /\bdiscount\b/i,
  /\bcost\b.*\b(per|month|year|seat|user)\b/i,
  /\bcontract\b/i,
  /\bnegotiat\w*/i,
];

export const answerTechnicalQuestionTool: Tool = {
  name: "answer_technical_question",
  description:
    "Answer a technical buyer's question with bounded scope. ALWAYS defers pricing/contract talk to the AM. Returns structured answer + assumptions + topics that need human handoff.",
  parameters: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "The buyer's technical question.",
      },
      audienceTier: { type: "string", enum: AUDIENCE_TIERS },
      productContext: {
        type: "string",
        description:
          "What the SE knows about the product / docs / supported stack. Used as ground truth. ≤4000 chars.",
      },
      knownStack: {
        type: "array",
        description: "Buyer's tech stack tags (AWS, GCP, K8s, Vercel, etc.).",
        items: { type: "string" },
      },
    },
    required: ["question", "audienceTier", "productContext"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const question = String(args.question).trim();
    const audienceTier = String(args.audienceTier);
    const productContext = String(args.productContext).trim();
    const knownStack = Array.isArray(args.knownStack)
      ? (args.knownStack as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 10)
      : [];

    if (!(AUDIENCE_TIERS as readonly string[]).includes(audienceTier)) {
      return {
        ok: false,
        refused: true,
        reason: `audienceTier must be one of: ${AUDIENCE_TIERS.join(", ")}`,
      };
    }
    if (question.length < MIN_Q_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `question too short (need ≥${MIN_Q_LEN} chars).`,
      };
    }
    if (question.length > MAX_Q_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `question too long (max ${MAX_Q_LEN} chars).`,
      };
    }
    if (productContext.length < 30) {
      return {
        ok: false,
        refused: true,
        reason: "productContext too short — SE needs grounding.",
      };
    }
    if (productContext.length > MAX_CONTEXT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `productContext too long (max ${MAX_CONTEXT_LEN} chars).`,
      };
    }

    const pricingDeferred = PRICING_PATTERNS.some((re) => re.test(question));

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: question.slice(0, 400),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const tierClause: Record<(typeof AUDIENCE_TIERS)[number], string> = {
      engineer_individual: "Audience is an IC engineer. Be precise; cite spec details when relevant.",
      engineer_lead: "Audience is an eng lead. Include trade-offs + ops considerations.",
      engineering_director: "Audience is a director. Lead with architecture + risk; defer detail to follow-ups.",
      cto: "Audience is a CTO. Focus on architecture, scaling, security posture.",
      non_technical_decision_maker:
        "Audience is non-technical. Translate jargon; lead with business impact.",
    };

    const systemPrompt = [
      "You are the Sales Engineer responding to a technical buyer question.",
      "Output STRICT JSON: { answer, confidence, assumptions, deferToHumanOn, pricingDeferred, relatedDocsHint }.",
      "answer: ≤300 words. Direct, no fluff. Cite productContext where possible.",
      "confidence: 'low' | 'medium' | 'high' — be honest; 'low' triggers the AM to follow up.",
      "assumptions: 0-5 strings — what you assumed to answer.",
      "deferToHumanOn: array of topics outside the SE scope (compliance contracts, custom pricing, on-prem deals, etc.).",
      `pricingDeferred: ${pricingDeferred ? "MUST be true — the question touches pricing/contract." : "true ONLY if the answer would otherwise quote a price."}`,
      "relatedDocsHint: 1 sentence hinting at canonical documentation, NO invented URLs.",
      "ABSOLUTE RULES:",
      "  - NEVER quote prices, discounts, or SLAs not in productContext.",
      "  - NEVER promise unreleased features.",
      "  - NEVER claim certifications (SOC 2, ISO, HIPAA) unless in productContext.",
      `Audience: ${tierClause[audienceTier as (typeof AUDIENCE_TIERS)[number]]}`,
      knownStack.length > 0 ? `Buyer stack: ${knownStack.join(", ")}` : "",
      "Brand Bible context:",
      bbBlock,
      "Operator-supplied productContext (treat as ground truth):",
      productContext,
    ]
      .filter(Boolean)
      .join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        max_tokens: 900,
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
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return { ok: false, refused: true, reason: "Model returned invalid JSON." };
      }

      // Enforce pricingDeferred override server-side.
      const finalPricingDeferred =
        pricingDeferred || Boolean(parsed.pricingDeferred);

      await logSecurityEvent({
        kind: "se.question.answered",
        tenantId: ctx.tenantId,
        payload: {
          subject: "se.question.answered",
          audienceTier,
          knownStackCount: knownStack.length,
          pricingDeferred: finalPricingDeferred,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          audienceTier,
          knownStack,
          answer: typeof parsed.answer === "string" ? parsed.answer : "",
          confidence:
            typeof parsed.confidence === "string"
              ? (parsed.confidence as string)
              : "medium",
          assumptions: Array.isArray(parsed.assumptions)
            ? (parsed.assumptions as string[])
            : [],
          deferToHumanOn: Array.isArray(parsed.deferToHumanOn)
            ? (parsed.deferToHumanOn as string[])
            : [],
          pricingDeferred: finalPricingDeferred,
          relatedDocsHint:
            typeof parsed.relatedDocsHint === "string"
              ? parsed.relatedDocsHint
              : "",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `SE answer failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
