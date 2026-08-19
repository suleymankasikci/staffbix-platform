import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * compose_runbook — draft a structured runbook section for a system
 * or process. The Ops Lead uses this when:
 *   - a new system goes live
 *   - an incident exposes a missing playbook
 *   - documentation falls out of date
 *
 * Output JSON:
 *   - title
 *   - overview: 1-2 sentences
 *   - prerequisites[]
 *   - steps: [{ step, action, who, expectedOutput }]
 *   - rollback: 1-3 strings
 *   - relatedMetrics: 1-4 strings
 *   - oncallEscalation: 1 sentence
 *   - openQuestions: 0-3 strings the operator must confirm
 */

const MODEL = "gpt-4o-mini";

const SYSTEM_TYPES = [
  "deploy_pipeline",
  "data_backup",
  "incident_response",
  "billing_reconcile",
  "user_offboarding",
  "tenant_migration",
  "rate_limit_breach",
  "outbound_email_pause",
  "other",
] as const;

const MIN_PROMPT_LEN = 30;
const MAX_PROMPT_LEN = 4000;

export const composeRunbookTool: Tool = {
  name: "compose_runbook",
  description:
    "Draft a structured runbook section: overview + prerequisites + numbered steps (action / who / expectedOutput) + rollback + related metrics + oncall escalation. Use this when a new system goes live or an incident exposes a documentation gap.",
  parameters: {
    type: "object",
    properties: {
      systemName: { type: "string", description: "The system or process the runbook covers." },
      systemType: { type: "string", enum: SYSTEM_TYPES },
      situation: {
        type: "string",
        description:
          "Why are we writing this runbook? Recent incident, new launch, audit finding, etc. 1-3 sentences.",
      },
      knownProcedure: {
        type: "string",
        description:
          "Whatever the operator currently knows about handling this. Free text — the model normalises into steps.",
      },
    },
    required: ["systemName", "systemType", "situation"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const systemName = String(args.systemName).trim();
    const systemType = String(args.systemType);
    const situation = String(args.situation).trim();
    const knownProcedure = args.knownProcedure
      ? String(args.knownProcedure).trim()
      : "";

    if (!(SYSTEM_TYPES as readonly string[]).includes(systemType)) {
      return {
        ok: false,
        refused: true,
        reason: `systemType must be one of: ${SYSTEM_TYPES.join(", ")}`,
      };
    }
    if (systemName.length < 3) {
      return { ok: false, refused: true, reason: "systemName too short." };
    }
    if (situation.length < MIN_PROMPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `situation too short (need ≥${MIN_PROMPT_LEN} chars).`,
      };
    }
    if (situation.length > MAX_PROMPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `situation too long (max ${MAX_PROMPT_LEN} chars).`,
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `${systemName} ${systemType} runbook procedure escalation`.slice(0, 300),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches — apply generic operations defaults)";

    const systemPrompt = [
      "You are the Ops Lead drafting an operations runbook.",
      "Output STRICT JSON: { title, overview, prerequisites, steps, rollback, relatedMetrics, oncallEscalation, openQuestions }.",
      "title: short, 'Runbook: …' style.",
      "overview: 1-2 sentences — what this covers and when to run it.",
      "prerequisites: 1-5 strings — credentials, tools, approvals required before running.",
      "steps: 3-10 entries, each { step (1-based int), action (≤30 words), who (role/person), expectedOutput (≤20 words) }.",
      "rollback: 1-3 strings — how to undo if something breaks.",
      "relatedMetrics: 1-4 strings — what to watch during/after.",
      "oncallEscalation: 1 sentence — who to page if the runbook fails.",
      "openQuestions: 0-3 strings — things the operator must confirm before this is canon.",
      "DO NOT invent system endpoints or credential names. Use placeholders like '<API endpoint>' when unsure.",
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const userContent = [
      `systemName: ${systemName}`,
      `systemType: ${systemType}`,
      `situation: ${situation}`,
      knownProcedure ? `knownProcedure:\n${knownProcedure}` : "",
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

      const steps = Array.isArray(parsed.steps)
        ? (parsed.steps as Array<Record<string, unknown>>).map((s, i) => ({
            step:
              typeof s.step === "number" && Number.isInteger(s.step)
                ? (s.step as number)
                : i + 1,
            action: typeof s.action === "string" ? s.action : "",
            who: typeof s.who === "string" ? s.who : "",
            expectedOutput:
              typeof s.expectedOutput === "string" ? s.expectedOutput : "",
          }))
        : [];

      await logSecurityEvent({
        kind: "ops.runbook.composed",
        tenantId: ctx.tenantId,
        payload: {
          subject: "ops.runbook.composed",
          systemName,
          systemType,
          stepCount: steps.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          systemName,
          systemType,
          title: typeof parsed.title === "string" ? parsed.title : "",
          overview: typeof parsed.overview === "string" ? parsed.overview : "",
          prerequisites: Array.isArray(parsed.prerequisites)
            ? (parsed.prerequisites as string[])
            : [],
          steps,
          rollback: Array.isArray(parsed.rollback)
            ? (parsed.rollback as string[])
            : [],
          relatedMetrics: Array.isArray(parsed.relatedMetrics)
            ? (parsed.relatedMetrics as string[])
            : [],
          oncallEscalation:
            typeof parsed.oncallEscalation === "string"
              ? parsed.oncallEscalation
              : "",
          openQuestions: Array.isArray(parsed.openQuestions)
            ? (parsed.openQuestions as string[])
            : [],
          notCanon:
            "Draft only. Have the operator confirm openQuestions and place into the master runbook index.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Runbook composition failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
