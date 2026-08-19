import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * draft_integration_outline — given the buyer's stack + the
 * integration touchpoints they care about (auth, billing, data
 * pipeline, etc.), draft a structured architecture outline:
 *   - overview: 2-3 sentences
 *   - components: [{ name, role, ownedBy }]
 *   - dataFlows: [{ from, to, payload, frequency, transport }]
 *   - openQuestions: things the SE needs the buyer to answer
 *   - estimatedComplexity: 'low' | 'medium' | 'high'
 *   - estimatedTimelineWeeks: realistic range string
 *   - assumptions
 *
 * The outline is staged for review — the SE never commits the
 * organization to an SLA or delivery date.
 */

const MODEL = "gpt-4o-mini";

const TOUCHPOINTS = [
  "sso_auth",
  "scim_provisioning",
  "data_ingest",
  "data_export",
  "webhook_outbound",
  "webhook_inbound",
  "billing_sync",
  "crm_sync",
  "support_ticket_sync",
  "audit_log_export",
] as const;

const MIN_OVERVIEW_LEN = 30;
const MAX_OVERVIEW_LEN = 4000;

export const draftIntegrationOutlineTool: Tool = {
  name: "draft_integration_outline",
  description:
    "Draft an integration architecture outline (components, dataFlows, openQuestions, complexity, timeline). NEVER commits to a specific SLA or delivery date.",
  parameters: {
    type: "object",
    properties: {
      buyerOverview: {
        type: "string",
        description:
          "Description of the buyer's current architecture + what they want to integrate. 2-6 sentences.",
      },
      buyerStack: {
        type: "array",
        description: "Stack tags (AWS, K8s, Postgres, Snowflake, etc.). ≤15.",
        items: { type: "string" },
      },
      touchpoints: {
        type: "array",
        description: "1-8 touchpoints the buyer wants. From the supported enum.",
        items: { type: "string", enum: TOUCHPOINTS },
      },
      mustHaveConstraints: {
        type: "array",
        description: "Hard constraints (e.g., 'EU data residency', 'on-prem only'). 0-5 entries.",
        items: { type: "string" },
      },
    },
    required: ["buyerOverview", "touchpoints"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const buyerOverview = String(args.buyerOverview).trim();
    const buyerStack = Array.isArray(args.buyerStack)
      ? (args.buyerStack as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 15)
      : [];
    const rawTouch = Array.isArray(args.touchpoints)
      ? (args.touchpoints as string[])
      : [];
    const touchpoints = rawTouch
      .filter((t) => (TOUCHPOINTS as readonly string[]).includes(t))
      .slice(0, 8);
    const mustHaveConstraints = Array.isArray(args.mustHaveConstraints)
      ? (args.mustHaveConstraints as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 5)
      : [];

    if (buyerOverview.length < MIN_OVERVIEW_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `buyerOverview too short (need ≥${MIN_OVERVIEW_LEN} chars).`,
      };
    }
    if (buyerOverview.length > MAX_OVERVIEW_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `buyerOverview too long (max ${MAX_OVERVIEW_LEN} chars).`,
      };
    }
    if (rawTouch.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: "touchpoints required (at least one supported entry).",
      };
    }
    if (touchpoints.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: `touchpoints must include at least one of: ${TOUCHPOINTS.join(", ")}`,
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `integration architecture ${touchpoints.join(" ")} ${buyerStack.join(" ")}`.slice(0, 300),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const systemPrompt = [
      "You are the Sales Engineer drafting an integration outline for operator review.",
      "Output STRICT JSON: { overview, components, dataFlows, openQuestions, estimatedComplexity, estimatedTimelineWeeks, assumptions }.",
      "overview: 2-3 sentences describing the integration approach.",
      "components: 3-8 entries of { name, role, ownedBy }. ownedBy: 'vendor' | 'customer' | 'shared'.",
      "dataFlows: 2-8 entries of { from, to, payload, frequency, transport }. transport: 'rest' | 'webhook' | 'event_stream' | 'sftp' | 'batch_export'.",
      "openQuestions: 2-5 strings — what the SE needs the buyer to answer.",
      "estimatedComplexity: 'low' | 'medium' | 'high'.",
      "estimatedTimelineWeeks: short string like '4-6' (NEVER a fixed promise).",
      "assumptions: 1-5 strings — what you assumed.",
      "ABSOLUTE RULES:",
      "  - NEVER promise a specific SLA (uptime / latency).",
      "  - NEVER promise a specific go-live date.",
      "  - NEVER claim regulatory certifications not in productContext / Brand Bible.",
      `touchpoints: ${touchpoints.join(", ")}`,
      buyerStack.length > 0 ? `buyerStack: ${buyerStack.join(", ")}` : "",
      mustHaveConstraints.length > 0
        ? `mustHaveConstraints:\n${mustHaveConstraints.map((c) => `  - ${c}`).join("\n")}`
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
          { role: "user", content: buyerOverview },
        ],
        max_tokens: 1500,
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

      const components = Array.isArray(parsed.components)
        ? (parsed.components as Array<Record<string, unknown>>).map((c) => ({
            name: typeof c.name === "string" ? c.name : "",
            role: typeof c.role === "string" ? c.role : "",
            ownedBy:
              typeof c.ownedBy === "string" &&
              ["vendor", "customer", "shared"].includes(c.ownedBy as string)
                ? (c.ownedBy as string)
                : "shared",
          }))
        : [];
      const dataFlows = Array.isArray(parsed.dataFlows)
        ? (parsed.dataFlows as Array<Record<string, unknown>>).map((f) => ({
            from: typeof f.from === "string" ? f.from : "",
            to: typeof f.to === "string" ? f.to : "",
            payload: typeof f.payload === "string" ? f.payload : "",
            frequency: typeof f.frequency === "string" ? f.frequency : "",
            transport:
              typeof f.transport === "string" &&
              ["rest", "webhook", "event_stream", "sftp", "batch_export"].includes(
                f.transport as string,
              )
                ? (f.transport as string)
                : "rest",
          }))
        : [];

      await logSecurityEvent({
        kind: "se.integration.outlined",
        tenantId: ctx.tenantId,
        payload: {
          subject: "se.integration.outlined",
          touchpoints,
          stackCount: buyerStack.length,
          componentsCount: components.length,
          dataFlowsCount: dataFlows.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          touchpoints,
          buyerStack,
          overview: typeof parsed.overview === "string" ? parsed.overview : "",
          components,
          dataFlows,
          openQuestions: Array.isArray(parsed.openQuestions)
            ? (parsed.openQuestions as string[])
            : [],
          estimatedComplexity:
            typeof parsed.estimatedComplexity === "string" &&
            ["low", "medium", "high"].includes(
              parsed.estimatedComplexity as string,
            )
              ? (parsed.estimatedComplexity as string)
              : "medium",
          estimatedTimelineWeeks:
            typeof parsed.estimatedTimelineWeeks === "string"
              ? parsed.estimatedTimelineWeeks
              : "",
          assumptions: Array.isArray(parsed.assumptions)
            ? (parsed.assumptions as string[])
            : [],
          notForCommitment:
            "Outline only. SE has NOT committed to SLA or go-live date — operator + delivery team confirm.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Integration outline failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
