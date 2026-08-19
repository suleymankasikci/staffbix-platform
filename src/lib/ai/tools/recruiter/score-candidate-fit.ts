import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * score_candidate_fit — score a candidate against a role on three
 * dimensions:
 *   - requirementsCoverage: 0-100, deterministic — how many of the
 *     role's mustHaveSkills are present in candidate.skills (case-insensitive
 *     substring match).
 *   - experienceMatch: 0-100, deterministic — yearsExperience vs role.minYears.
 *   - softFit: 0-100, LLM-rated for stack overlap + tenure quality.
 *
 * Output:
 *   - totalScore (weighted), recommendedAction ('reach_out' | 'tag_for_later'
 *     | 'pass')
 *   - protectedAttributeFlags[] — server-side scan rejects any reasoning
 *     touching protected attributes (age, gender, race, religion, marital
 *     status, pregnancy, disability, national origin).
 *
 * Hard rules:
 *   - NEVER reasons over protected attributes.
 *   - NEVER infers age from dates of education / employment ("graduated
 *     2005 so probably 40+").
 */

const MODEL = "gpt-4o-mini";

const MIN_SKILLS = 1;
const MAX_SKILLS = 50;

const PROTECTED_PATTERNS = [
  /\bage\b/i,
  /\byears? old\b/i,
  /\bgender\b/i,
  /\bmale\b/i,
  /\bfemale\b/i,
  /\brace\b/i,
  /\bethnicity\b/i,
  /\breligion\b/i,
  /\bchristian\b/i,
  /\bmuslim\b/i,
  /\bjewish\b/i,
  /\bmarried\b/i,
  /\bsingle\b/i,
  /\bchildren\b/i,
  /\bpregnan/i,
  /\bdisabilit/i,
  /\bdisabled\b/i,
  /\bnationality\b/i,
  /\bnational origin\b/i,
];

export const scoreCandidateFitTool: Tool = {
  name: "score_candidate_fit",
  description:
    "Score a candidate against a role: requirementsCoverage + experienceMatch (deterministic) + softFit (LLM). NEVER reasons over protected attributes — server-side scan rejects any such reasoning.",
  parameters: {
    type: "object",
    properties: {
      candidateName: { type: "string", description: "First name only; full name never required." },
      candidateSkills: {
        type: "array",
        description: "1-50 skill strings from candidate's profile/CV.",
        items: { type: "string" },
      },
      yearsExperience: {
        type: "integer",
        description: "Total years of relevant experience. 0-60.",
        minimum: 0,
        maximum: 60,
      },
      summaryFromCv: {
        type: "string",
        description: "Operator-supplied summary. ≤2000 chars. PII redacted by operator.",
      },
      role: {
        type: "object",
        description:
          "{ title, mustHaveSkills (1-30 strings), minYears, stackKeywords (optional) }.",
        properties: {
          title: { type: "string" },
          mustHaveSkills: { type: "array", items: { type: "string" } },
          minYears: { type: "integer", minimum: 0, maximum: 60 },
          stackKeywords: { type: "array", items: { type: "string" } },
        },
      },
    },
    required: ["candidateName", "candidateSkills", "yearsExperience", "summaryFromCv", "role"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const candidateName = String(args.candidateName).trim().slice(0, 40);
    const candidateSkills = Array.isArray(args.candidateSkills)
      ? (args.candidateSkills as string[])
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter((s) => s.length > 0)
      : [];
    const yearsExperience = Math.max(
      0,
      Math.min(60, Math.round(Number(args.yearsExperience))),
    );
    const summaryFromCv = String(args.summaryFromCv).trim();
    const roleRaw =
      typeof args.role === "object" && args.role !== null
        ? (args.role as Record<string, unknown>)
        : {};
    const title = typeof roleRaw.title === "string" ? roleRaw.title.trim() : "";
    const mustHaveSkills = Array.isArray(roleRaw.mustHaveSkills)
      ? (roleRaw.mustHaveSkills as string[])
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter((s) => s.length > 0)
      : [];
    const minYears = Math.max(
      0,
      Math.min(60, Math.round(Number(roleRaw.minYears ?? 0))),
    );
    const stackKeywords = Array.isArray(roleRaw.stackKeywords)
      ? (roleRaw.stackKeywords as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 20)
      : [];

    if (candidateName.length < 1) {
      return { ok: false, refused: true, reason: "candidateName required." };
    }
    if (
      candidateSkills.length < MIN_SKILLS ||
      candidateSkills.length > MAX_SKILLS
    ) {
      return {
        ok: false,
        refused: true,
        reason: `candidateSkills must have ${MIN_SKILLS}-${MAX_SKILLS} entries.`,
      };
    }
    if (summaryFromCv.length < 30 || summaryFromCv.length > 3000) {
      return {
        ok: false,
        refused: true,
        reason: "summaryFromCv must be 30-3000 chars.",
      };
    }
    if (title.length < 2) {
      return { ok: false, refused: true, reason: "role.title required." };
    }
    if (mustHaveSkills.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: "role.mustHaveSkills required (at least one).",
      };
    }

    // Server-side protected-attribute scan over operator-supplied summary.
    const operatorProtectedHits = PROTECTED_PATTERNS.filter((re) =>
      re.test(summaryFromCv),
    );
    if (operatorProtectedHits.length > 0) {
      // The operator passed protected info — refuse to score and tell them.
      return {
        ok: false,
        refused: true,
        reason: `summaryFromCv contains protected attribute patterns (${operatorProtectedHits.map((re) => String(re)).join(", ")}). Redact before scoring.`,
      };
    }

    // Deterministic: requirements coverage.
    const lcSkills = candidateSkills.map((s) => s.toLowerCase());
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    for (const must of mustHaveSkills) {
      const mustLc = must.toLowerCase();
      const found = lcSkills.some(
        (cs) => cs === mustLc || cs.includes(mustLc) || mustLc.includes(cs),
      );
      if (found) matchedSkills.push(must);
      else missingSkills.push(must);
    }
    const requirementsCoverage = Math.round(
      (matchedSkills.length / mustHaveSkills.length) * 100,
    );

    // Deterministic: experience match (linear up to minYears, then 100).
    const experienceMatch =
      minYears === 0
        ? 100
        : Math.min(100, Math.round((yearsExperience / minYears) * 100));

    // LLM soft fit.
    const systemPrompt = [
      "You are scoring a candidate on SOFT fit only (stack overlap + tenure quality). The deterministic requirements/experience scores are already computed; do not duplicate them.",
      "Output STRICT JSON: { softScore, reasoning, redFlags }.",
      "softScore: integer 0-100.",
      "reasoning: 1-2 sentences. NEVER references protected attributes (age, gender, race, religion, marital status, children, disability, national origin).",
      "redFlags: 0-3 strings — neutral, observable concerns (e.g., 'no public open-source presence', 'multiple short tenures'). NEVER protected.",
      "ABSOLUTE RULES:",
      "  - DO NOT infer age from graduation year, employment dates, etc.",
      "  - DO NOT comment on gender/identity.",
      "  - DO NOT comment on location bias.",
      `Role: ${title} (minYears=${minYears})`,
      stackKeywords.length > 0
        ? `Stack keywords to weight: ${stackKeywords.join(", ")}`
        : "",
      `Candidate skills: ${candidateSkills.join(", ")}`,
      `Candidate years experience: ${yearsExperience}`,
    ]
      .filter(Boolean)
      .join("\n");

    const t0 = Date.now();
    let softScore = 50;
    let reasoning = "";
    let redFlags: string[] = [];
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Candidate summary:\n${summaryFromCv}` },
        ],
        max_tokens: 400,
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
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const rawScore = Number(parsed.softScore);
      softScore = Number.isFinite(rawScore)
        ? Math.max(0, Math.min(100, Math.round(rawScore)))
        : 50;
      reasoning =
        typeof parsed.reasoning === "string" ? (parsed.reasoning as string) : "";
      redFlags = Array.isArray(parsed.redFlags)
        ? (parsed.redFlags as string[]).slice(0, 3)
        : [];
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Soft scoring failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    // Server-side scan over model reasoning + redFlags.
    const protectedAttributeFlags: string[] = [];
    const llmBlob = `${reasoning} ${redFlags.join(" ")}`;
    for (const re of PROTECTED_PATTERNS) {
      if (re.test(llmBlob)) {
        protectedAttributeFlags.push(
          `LLM output mentioned a protected-attribute pattern (${String(re)}) — redacted.`,
        );
      }
    }
    if (protectedAttributeFlags.length > 0) {
      reasoning = "[REDACTED — soft-fit reasoning touched protected attributes.]";
      redFlags = redFlags.filter(
        (f) => !PROTECTED_PATTERNS.some((re) => re.test(f)),
      );
    }

    // Weighted total: requirements 50%, experience 25%, softFit 25%.
    const totalScore = Math.round(
      requirementsCoverage * 0.5 + experienceMatch * 0.25 + softScore * 0.25,
    );

    const recommendedAction =
      totalScore >= 75
        ? "reach_out"
        : totalScore >= 55
          ? "tag_for_later"
          : "pass";

    await logSecurityEvent({
      kind: "recruiter.candidate.scored",
      tenantId: ctx.tenantId,
      payload: {
        subject: "recruiter.candidate.scored",
        candidateName,
        role: title,
        totalScore,
        requirementsCoverage,
        experienceMatch,
        softScore,
        recommendedAction,
        protectedFlagsCount: protectedAttributeFlags.length,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        candidateName,
        role: title,
        totalScore,
        breakdown: {
          requirementsCoverage,
          matchedSkills,
          missingSkills,
          experienceMatch,
          yearsExperience,
          roleMinYears: minYears,
          softScore,
        },
        reasoning,
        redFlags,
        protectedAttributeFlags,
        recommendedAction,
      },
    };
  },
};
