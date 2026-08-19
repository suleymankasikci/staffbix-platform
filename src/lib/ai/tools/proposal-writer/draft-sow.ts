import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * draft_sow — produce a structured Statement of Work for a project.
 * Output JSON:
 *   - projectName
 *   - scope: 1 paragraph
 *   - deliverables: [{ name, description, ownedBy }]
 *   - milestones: [{ week, title, exitCriteria }]
 *   - roles: [{ role, responsibility, allocationPct }]
 *   - acceptanceCriteria: 3-6 strings
 *   - assumptions, exclusions
 *   - pricingPlaceholder: literal placeholder string (no numbers)
 *   - notForSignature: disclaimer
 */

const MODEL = "gpt-4o-mini";

const MIN_BRIEF_LEN = 30;
const MAX_BRIEF_LEN = 4000;
const MIN_WEEKS = 1;
const MAX_WEEKS = 104;

export const draftSowTool: Tool = {
  name: "draft_sow",
  description:
    "Draft a structured Statement of Work (scope, deliverables, milestones, roles, acceptance criteria, assumptions, exclusions). Pricing is intentionally a placeholder — operator fills it.",
  parameters: {
    type: "object",
    properties: {
      projectName: { type: "string" },
      brief: {
        type: "string",
        description: "What the project is, why it matters, success criteria.",
      },
      durationWeeks: {
        type: "integer",
        description: "Target duration in weeks. 1-104.",
        minimum: MIN_WEEKS,
        maximum: MAX_WEEKS,
      },
      keyDeliverables: {
        type: "array",
        description: "1-15 operator-supplied deliverables.",
        items: { type: "string" },
      },
      knownExclusions: {
        type: "array",
        description: "0-5 things explicitly out of scope.",
        items: { type: "string" },
      },
    },
    required: ["projectName", "brief", "durationWeeks", "keyDeliverables"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const projectName = String(args.projectName).trim();
    const brief = String(args.brief).trim();
    const durationWeeks = Math.max(
      MIN_WEEKS,
      Math.min(MAX_WEEKS, Math.round(Number(args.durationWeeks))),
    );
    const keyDeliverables = Array.isArray(args.keyDeliverables)
      ? (args.keyDeliverables as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 15)
      : [];
    const knownExclusions = Array.isArray(args.knownExclusions)
      ? (args.knownExclusions as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 5)
      : [];

    if (projectName.length < 3) {
      return { ok: false, refused: true, reason: "projectName too short." };
    }
    if (brief.length < MIN_BRIEF_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `brief too short (need ≥${MIN_BRIEF_LEN} chars).`,
      };
    }
    if (brief.length > MAX_BRIEF_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `brief too long (max ${MAX_BRIEF_LEN} chars).`,
      };
    }
    if (keyDeliverables.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: "keyDeliverables required (at least one).",
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `SOW ${projectName} delivery methodology`.slice(0, 300),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const systemPrompt = [
      "You are the Proposal Writer drafting a Statement of Work.",
      "Output STRICT JSON: { projectName, scope, deliverables, milestones, roles, acceptanceCriteria, assumptions, exclusions, pricingPlaceholder }.",
      "scope: 1 paragraph (≤120 words) describing what's being delivered.",
      "deliverables: array. Each: { name, description, ownedBy ('vendor' | 'customer' | 'shared') }. Cover the operator's keyDeliverables.",
      `milestones: 3-${Math.min(8, durationWeeks)} entries. Each: { week (1..${durationWeeks}), title, exitCriteria }.`,
      "roles: 3-6 entries of { role, responsibility, allocationPct }.",
      "acceptanceCriteria: 3-6 verifiable criteria.",
      "assumptions: 2-5 strings — what you assumed.",
      "exclusions: echo operator knownExclusions verbatim and add 0-3 more.",
      "pricingPlaceholder: literal '[PRICING — AM to confirm]'. DO NOT include numbers.",
      "ABSOLUTE RULES:",
      "  - NEVER include dollar amounts, rate cards, or discount language.",
      "  - NEVER promise SLAs (uptime, latency) without Brand Bible support.",
      `Project duration: ${durationWeeks} weeks.`,
      knownExclusions.length > 0
        ? `Operator knownExclusions: ${knownExclusions.join(" | ")}`
        : "",
      "Brand Bible context:",
      bbBlock,
    ]
      .filter(Boolean)
      .join("\n");

    const userContent = [
      `projectName: ${projectName}`,
      "keyDeliverables:",
      ...keyDeliverables.map((d) => `  - ${d}`),
      "",
      "brief:",
      brief,
    ].join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 1700,
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

      const milestones = Array.isArray(parsed.milestones)
        ? (parsed.milestones as Array<Record<string, unknown>>).map((m) => ({
            week:
              typeof m.week === "number" && Number.isInteger(m.week)
                ? Math.max(1, Math.min(durationWeeks, m.week as number))
                : 1,
            title: typeof m.title === "string" ? m.title : "",
            exitCriteria:
              typeof m.exitCriteria === "string" ? m.exitCriteria : "",
          }))
        : [];

      await logSecurityEvent({
        kind: "proposal.sow.drafted",
        tenantId: ctx.tenantId,
        payload: {
          subject: "proposal.sow.drafted",
          projectName,
          durationWeeks,
          deliverablesCount: keyDeliverables.length,
          milestonesCount: milestones.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          projectName,
          durationWeeks,
          scope: typeof parsed.scope === "string" ? parsed.scope : "",
          deliverables: Array.isArray(parsed.deliverables)
            ? (parsed.deliverables as Array<Record<string, unknown>>)
            : [],
          milestones,
          roles: Array.isArray(parsed.roles)
            ? (parsed.roles as Array<Record<string, unknown>>)
            : [],
          acceptanceCriteria: Array.isArray(parsed.acceptanceCriteria)
            ? (parsed.acceptanceCriteria as string[])
            : [],
          assumptions: Array.isArray(parsed.assumptions)
            ? (parsed.assumptions as string[])
            : [],
          exclusions: Array.isArray(parsed.exclusions)
            ? (parsed.exclusions as string[])
            : knownExclusions,
          pricingPlaceholder: "[PRICING — AM to confirm]",
          notForSignature:
            "Draft only. AM confirms pricing, legal confirms terms, operator signs.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `SOW draft failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
