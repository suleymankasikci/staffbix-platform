import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * review_contract_clause — given a clause / clause excerpt from a
 * contract, the Legal Helper produces a structured review:
 *   - severity: 'low' | 'medium' | 'high'
 *   - risks[]: specific concerns
 *   - unusualPhrasing[]: language that deviates from standard
 *   - jurisdictionConcerns[]: jurisdiction-specific issues
 *   - suggestedRedline: one concrete change the operator could ask for
 *   - notLegalAdvice: disclaimer
 *
 * Like draft_legal_document, this is review-only output — the LLM is
 * explicitly told not to claim final legal authority. The operator's
 * configured risk threshold (specifics.riskThreshold in role-configs)
 * is passed in via riskThreshold arg to shape verbosity.
 */

const MODEL = "gpt-4o-mini";

const CLAUSE_TYPES = [
  "indemnity",
  "limitation_of_liability",
  "confidentiality",
  "termination",
  "data_processing",
  "ip_assignment",
  "non_compete",
  "auto_renewal",
  "warranty",
  "governing_law",
  "other",
] as const;

const RISK_THRESHOLDS = [
  "obvious_only",
  "medium_and_above",
  "everything_unusual",
] as const;

const MIN_CLAUSE_LEN = 30;
const MAX_CLAUSE_LEN = 4000;

export const reviewContractClauseTool: Tool = {
  name: "review_contract_clause",
  description:
    "Review a single contract clause and return a structured risk assessment (severity, risks, unusual phrasing, jurisdiction concerns, suggested redline). NEVER claims final legal authority; always includes a 'not legal advice' disclaimer.",
  parameters: {
    type: "object",
    properties: {
      clauseText: {
        type: "string",
        description: "The clause to review — paste verbatim.",
      },
      clauseType: {
        type: "string",
        enum: CLAUSE_TYPES,
        description: "What kind of clause this is (helps the reviewer apply the right standard).",
      },
      jurisdiction: {
        type: "string",
        description:
          "Governing law (e.g., 'US-Delaware', 'EU-Germany'). Optional but improves jurisdiction-specific flags.",
      },
      riskThreshold: {
        type: "string",
        enum: RISK_THRESHOLDS,
        description:
          "How loud to be. obvious_only = only show high-severity. everything_unusual = surface anything non-standard.",
      },
      ourRole: {
        type: "string",
        description:
          "Which side is the operator on? 'customer' | 'vendor' | 'employer' | 'employee' | 'licensor' | 'licensee'. Optional.",
      },
    },
    required: ["clauseText", "clauseType"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const clauseText = String(args.clauseText).trim();
    const clauseType = String(args.clauseType);
    const jurisdiction = args.jurisdiction ? String(args.jurisdiction).trim() : "";
    const riskThreshold =
      (args.riskThreshold as string | undefined)?.toLowerCase() ?? "medium_and_above";
    const ourRole = args.ourRole ? String(args.ourRole).trim().toLowerCase() : "";

    if (!(CLAUSE_TYPES as readonly string[]).includes(clauseType)) {
      return {
        ok: false,
        refused: true,
        reason: `clauseType must be one of: ${CLAUSE_TYPES.join(", ")}`,
      };
    }
    if (!(RISK_THRESHOLDS as readonly string[]).includes(riskThreshold)) {
      return {
        ok: false,
        refused: true,
        reason: `riskThreshold must be one of: ${RISK_THRESHOLDS.join(", ")}`,
      };
    }
    if (clauseText.length < MIN_CLAUSE_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `clauseText too short (need ≥${MIN_CLAUSE_LEN} chars).`,
      };
    }
    if (clauseText.length > MAX_CLAUSE_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `clauseText too long (max ${MAX_CLAUSE_LEN} chars).`,
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `${clauseType} standard terms ${jurisdiction}`.slice(0, 300),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches — apply common-market defaults)";

    const verbosityNote =
      riskThreshold === "obvious_only"
        ? "Only flag risks that would clearly damage the operator's position. Keep counts low."
        : riskThreshold === "everything_unusual"
          ? "Surface every deviation from standard language, including minor wording oddities."
          : "Flag risks of medium severity and above; skip purely cosmetic concerns.";

    const systemPrompt = [
      "You are reviewing a single contract clause for the operator.",
      "You are NOT counsel. Your output is structured input for the operator's counsel.",
      "Output STRICT JSON: { severity, risks, unusualPhrasing, jurisdictionConcerns, suggestedRedline, summary }.",
      "severity: 'low' | 'medium' | 'high'.",
      "risks: 1-5 specific concerns. Each ≤25 words.",
      "unusualPhrasing: 0-4 strings — direct quotes from the clause that deviate from standard.",
      "jurisdictionConcerns: 0-3 strings — jurisdiction-specific issues. Empty if no jurisdiction supplied or none apply.",
      "suggestedRedline: ONE concrete change to ask for. Be specific (e.g., 'cap liability at fees paid in trailing 12 months').",
      "summary: 1 sentence — the headline finding.",
      `Verbosity: ${verbosityNote}`,
      ourRole ? `Operator is the ${ourRole}.` : "",
      "Brand Bible context:",
      bbBlock,
    ]
      .filter(Boolean)
      .join("\n");

    const userParts: string[] = [
      `clauseType: ${clauseType}`,
      jurisdiction ? `jurisdiction: ${jurisdiction}` : "",
      "",
      "Clause:",
      clauseText,
    ].filter(Boolean);

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userParts.join("\n") },
        ],
        max_tokens: 700,
        temperature: 0.2,
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

      const severity =
        typeof parsed.severity === "string" &&
        ["low", "medium", "high"].includes(parsed.severity as string)
          ? (parsed.severity as string)
          : "medium";

      await logSecurityEvent({
        kind: "legal.clause.reviewed",
        tenantId: ctx.tenantId,
        payload: {
          subject: "legal.clause.reviewed",
          clauseType,
          jurisdiction: jurisdiction || null,
          ourRole: ourRole || null,
          riskThreshold,
          severity,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          clauseType,
          jurisdiction: jurisdiction || null,
          severity,
          summary: typeof parsed.summary === "string" ? parsed.summary : "",
          risks: Array.isArray(parsed.risks) ? (parsed.risks as string[]) : [],
          unusualPhrasing: Array.isArray(parsed.unusualPhrasing)
            ? (parsed.unusualPhrasing as string[])
            : [],
          jurisdictionConcerns: Array.isArray(parsed.jurisdictionConcerns)
            ? (parsed.jurisdictionConcerns as string[])
            : [],
          suggestedRedline:
            typeof parsed.suggestedRedline === "string"
              ? (parsed.suggestedRedline as string)
              : "",
          notLegalAdvice:
            "This review is informational and NOT legal advice. Have qualified counsel review before redlining or signing.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Clause review failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
