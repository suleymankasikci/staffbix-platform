import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * triage_bug_report — classify a bug report's severity, suspected
 * owner, reproduction confidence, and duplicate likelihood. The model
 * NEVER writes the actual fix or guesses at the root cause beyond
 * what's in the report.
 *
 * Output:
 *   - severity: 'P0' | 'P1' | 'P2' | 'P3'
 *   - suspectedOwnerTeam: enum from operator-supplied teams (or 'unknown')
 *   - reproConfidence: 'high' | 'medium' | 'low'
 *   - duplicateLikelihood: 'high' | 'medium' | 'low' (based on
 *     description similarity to known patterns)
 *   - missingDataNeeded: 0-4 strings the operator should ask for
 *   - userImpactNote: 1 sentence
 */

const MODEL = "gpt-4o-mini";

const MIN_DESC_LEN = 30;
const MAX_DESC_LEN = 6000;

// P0 markers — patterns that auto-escalate to P0 regardless of model.
const P0_PATTERNS = [
  /\bdata loss\b/i,
  /\bsecurity breach\b/i,
  /\bcustomer data exposed\b/i,
  /\bpayments? (?:not )?charging\b/i,
  /\bauth (?:broken|down)\b/i,
  /\boutage\b/i,
  /\bproduction down\b/i,
  /\bregulator\w*/i,
];

export const triageBugReportTool: Tool = {
  name: "triage_bug_report",
  description:
    "Classify a bug report's severity (P0-P3), suspected owner team, reproduction confidence, and duplicate likelihood. NEVER writes the fix or guesses at root cause beyond the report.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Bug report title. ≤200 chars.",
      },
      description: {
        type: "string",
        description: "Full bug description with steps + expected + actual. ≤6000 chars.",
      },
      environment: {
        type: "string",
        description:
          "Where it happened (e.g., 'Chrome 134 / macOS / prod', 'Mobile Safari / iOS 18 / staging').",
      },
      knownTeams: {
        type: "array",
        description: "Operator teams that can own bugs (e.g., 'auth', 'billing', 'platform').",
        items: { type: "string" },
      },
      affectedUsers: {
        type: "integer",
        description: "Optional: known count of affected users.",
        minimum: 0,
      },
    },
    required: ["title", "description"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const title = String(args.title).trim().slice(0, 200);
    const description = String(args.description).trim();
    const environment = args.environment
      ? String(args.environment).trim().slice(0, 300)
      : "";
    const knownTeams = Array.isArray(args.knownTeams)
      ? (args.knownTeams as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 20)
      : [];
    const affectedUsers = args.affectedUsers
      ? Math.max(0, Math.round(Number(args.affectedUsers)))
      : 0;

    if (title.length < 5) {
      return { ok: false, refused: true, reason: "title too short." };
    }
    if (description.length < MIN_DESC_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `description too short (need ≥${MIN_DESC_LEN} chars).`,
      };
    }
    if (description.length > MAX_DESC_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `description too long (max ${MAX_DESC_LEN} chars).`,
      };
    }

    // Server-side P0 detection.
    const fullBlob = `${title}\n${description}`;
    const p0Hits = P0_PATTERNS.filter((re) => re.test(fullBlob));
    const forceP0 = p0Hits.length > 0;

    const teamsClause =
      knownTeams.length > 0
        ? `suspectedOwnerTeam: one of: ${knownTeams.join(", ")}. Use 'unknown' if no match.`
        : "suspectedOwnerTeam: best guess as a free-form string, or 'unknown'.";

    const systemPrompt = [
      "You are a QA Lead triaging a bug report.",
      "Output STRICT JSON: { severity, suspectedOwnerTeam, reproConfidence, duplicateLikelihood, missingDataNeeded, userImpactNote }.",
      "severity: 'P0' | 'P1' | 'P2' | 'P3'.",
      teamsClause,
      "reproConfidence: 'high' | 'medium' | 'low' based on step clarity.",
      "duplicateLikelihood: 'high' | 'medium' | 'low' based on how generic the symptom is.",
      "missingDataNeeded: 0-4 short strings — what the operator should ask the reporter for.",
      "userImpactNote: 1 sentence — who is affected and how.",
      "ABSOLUTE RULES:",
      "  - NEVER speculate on root cause beyond what's in the report.",
      "  - NEVER write the fix.",
      forceP0
        ? `MANDATORY: severity MUST be 'P0' — detected critical pattern: ${p0Hits.map((re) => String(re)).join(", ")}`
        : "",
      environment ? `environment: ${environment}` : "",
      affectedUsers > 0 ? `affectedUsers: ${affectedUsers}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Title: ${title}\n\n${description}` },
        ],
        max_tokens: 600,
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

      let severity =
        typeof parsed.severity === "string" &&
        ["P0", "P1", "P2", "P3"].includes(parsed.severity as string)
          ? (parsed.severity as string)
          : "P2";
      if (forceP0) severity = "P0";

      const team =
        typeof parsed.suspectedOwnerTeam === "string"
          ? (parsed.suspectedOwnerTeam as string)
          : "unknown";
      const suspectedOwnerTeam =
        knownTeams.length === 0 || knownTeams.includes(team)
          ? team
          : "unknown";

      await logSecurityEvent({
        kind: "qa.bug.triaged",
        tenantId: ctx.tenantId,
        payload: {
          subject: "qa.bug.triaged",
          severity,
          suspectedOwnerTeam,
          forceP0,
          environment: environment || null,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          title,
          environment: environment || null,
          severity,
          suspectedOwnerTeam,
          reproConfidence:
            typeof parsed.reproConfidence === "string" &&
            ["high", "medium", "low"].includes(parsed.reproConfidence as string)
              ? (parsed.reproConfidence as string)
              : "medium",
          duplicateLikelihood:
            typeof parsed.duplicateLikelihood === "string" &&
            ["high", "medium", "low"].includes(
              parsed.duplicateLikelihood as string,
            )
              ? (parsed.duplicateLikelihood as string)
              : "low",
          missingDataNeeded: Array.isArray(parsed.missingDataNeeded)
            ? (parsed.missingDataNeeded as string[])
            : [],
          userImpactNote:
            typeof parsed.userImpactNote === "string"
              ? parsed.userImpactNote
              : "",
          forceP0,
          p0MatchedPatterns: p0Hits.map((re) => String(re)),
          affectedUsers,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Bug triage failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
