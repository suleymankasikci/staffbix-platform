import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * draft_product_spec — produce a structured product spec from a
 * problem statement + supporting evidence. Output JSON:
 *   - title, problem, users, requirements[], acceptanceCriteria[],
 *     outOfScope[], openQuestions[], riskFlags[]
 *
 * Approval mode = "Suggestion only" so the operator owns the final
 * cut; the tool never publishes / files Jira on its own.
 */

const MODEL = "gpt-4o-mini";

const SPEC_DEPTHS = ["one_paragraph", "paragraph_plus_bullets", "full_with_acceptance"] as const;

const MIN_PROBLEM_LEN = 30;
const MAX_PROBLEM_LEN = 4000;

export const draftProductSpecTool: Tool = {
  name: "draft_product_spec",
  description:
    "Draft a structured product spec: problem, users, requirements, acceptance criteria, out-of-scope, open questions, risks. Use this when customer feedback themes suggest a candidate feature. NEVER files tickets; staged for operator review only.",
  parameters: {
    type: "object",
    properties: {
      problem: {
        type: "string",
        description: "Problem statement. 1-3 sentences with user, pain, current workaround.",
      },
      candidateName: {
        type: "string",
        description: "Working title for the feature. ≤80 chars.",
      },
      customerFeedbackThemes: {
        type: "array",
        description: "1-10 distilled themes from support / sales / interviews.",
        items: { type: "string" },
      },
      targetUsers: {
        type: "array",
        description: "Who is this for? 1-5 user segments.",
        items: { type: "string" },
      },
      specDepth: {
        type: "string",
        enum: SPEC_DEPTHS,
        description: "How detailed should the spec be? Default 'paragraph_plus_bullets'.",
      },
    },
    required: ["problem", "candidateName"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const problem = String(args.problem).trim();
    const candidateName = String(args.candidateName).trim();
    const customerFeedbackThemes = Array.isArray(args.customerFeedbackThemes)
      ? (args.customerFeedbackThemes as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 10)
      : [];
    const targetUsers = Array.isArray(args.targetUsers)
      ? (args.targetUsers as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 5)
      : [];
    const specDepth = ((args.specDepth as string | undefined) ?? "paragraph_plus_bullets").toLowerCase();

    if (!(SPEC_DEPTHS as readonly string[]).includes(specDepth)) {
      return {
        ok: false,
        refused: true,
        reason: `specDepth must be one of: ${SPEC_DEPTHS.join(", ")}`,
      };
    }
    if (problem.length < MIN_PROBLEM_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `problem too short (need ≥${MIN_PROBLEM_LEN} chars).`,
      };
    }
    if (problem.length > MAX_PROBLEM_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `problem too long (max ${MAX_PROBLEM_LEN} chars).`,
      };
    }
    if (candidateName.length < 3 || candidateName.length > 80) {
      return {
        ok: false,
        refused: true,
        reason: "candidateName must be 3-80 chars.",
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `${candidateName} ${problem}`.slice(0, 400),
      k: 4,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches — base spec on the problem statement alone)";

    const depthClause =
      specDepth === "one_paragraph"
        ? "Keep total output very tight — one paragraph per section, no nested bullets."
        : specDepth === "full_with_acceptance"
          ? "Provide 4-8 explicit acceptanceCriteria (Given/When/Then style)."
          : "Provide concise paragraphs + 3-6 bullet items per applicable section.";

    const systemPrompt = [
      "You are a Product Manager drafting a feature spec for the operator.",
      "Output STRICT JSON: { title, problem, users, requirements, acceptanceCriteria, outOfScope, openQuestions, riskFlags }.",
      "title: ≤80 chars working title.",
      "problem: 1 paragraph (≤80 words). Restate cleanly; do not invent customer counts.",
      "users: 1-5 strings. Honor operator targetUsers when supplied.",
      "requirements: 3-8 strings. Each ≤25 words. Imperative voice ('User can …').",
      "acceptanceCriteria: 3-8 strings. Each testable.",
      "outOfScope: 1-3 strings explicitly excluded from this spec.",
      "openQuestions: 1-5 strings the operator must answer before engineering scopes.",
      "riskFlags: 0-3 strings — adoption, technical, brand, legal risks.",
      depthClause,
      "ABSOLUTE RULES:",
      "  - NEVER invent customer counts, NPS deltas, revenue impact.",
      "  - NEVER promise a release date.",
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const userContent = [
      `candidateName: ${candidateName}`,
      `specDepth: ${specDepth}`,
      targetUsers.length > 0 ? `targetUsers: ${targetUsers.join(", ")}` : "",
      customerFeedbackThemes.length > 0
        ? `customerFeedbackThemes:\n${customerFeedbackThemes.map((t) => `  - ${t}`).join("\n")}`
        : "",
      "",
      "problem:",
      problem,
    ]
      .filter(Boolean)
      .join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 1200,
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
        kind: "pm.spec.drafted",
        tenantId: ctx.tenantId,
        payload: {
          subject: "pm.spec.drafted",
          candidateName,
          specDepth,
          themeCount: customerFeedbackThemes.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          candidateName,
          specDepth,
          title: typeof parsed.title === "string" ? parsed.title : candidateName,
          problem: typeof parsed.problem === "string" ? parsed.problem : "",
          users: Array.isArray(parsed.users) ? (parsed.users as string[]) : targetUsers,
          requirements: Array.isArray(parsed.requirements)
            ? (parsed.requirements as string[])
            : [],
          acceptanceCriteria: Array.isArray(parsed.acceptanceCriteria)
            ? (parsed.acceptanceCriteria as string[])
            : [],
          outOfScope: Array.isArray(parsed.outOfScope)
            ? (parsed.outOfScope as string[])
            : [],
          openQuestions: Array.isArray(parsed.openQuestions)
            ? (parsed.openQuestions as string[])
            : [],
          riskFlags: Array.isArray(parsed.riskFlags)
            ? (parsed.riskFlags as string[])
            : [],
          notForFiling:
            "Draft only. Operator must confirm openQuestions and file the engineering ticket manually.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Spec draft failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
