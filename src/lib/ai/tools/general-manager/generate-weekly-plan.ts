import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * generate_weekly_plan — Monday morning plan in EXACTLY 5 bullets,
 * each tied to one of the operator's north-star KPIs.
 *
 * Output JSON:
 *   - headline: 1 sentence theme of the week
 *   - bullets: 5 strings, each { ≤25 words } prefixed with the KPI
 *     they serve (model returns the array of bullet objects).
 *   - kpiOwners: array of { kpi, owner, sla }
 *   - risks: 1-3 weekly risks
 *   - oneSentenceMemo: tweet-length
 */

const MODEL = "gpt-4o-mini";
const MIN_PROMPT_LEN = 30;
const MAX_PROMPT_LEN = 4000;

export const generateWeeklyPlanTool: Tool = {
  name: "generate_weekly_plan",
  description:
    "Produce the Monday plan: EXACTLY 5 bullets, each tied to a north-star KPI. Use this every week — bullets without a KPI link are not allowed.",
  parameters: {
    type: "object",
    properties: {
      priorWeekSummary: {
        type: "string",
        description:
          "What happened last week: wins, slips, open items. 1-5 sentences.",
      },
      openCommitments: {
        type: "array",
        description: "Carry-overs from prior weeks. Each ≤120 chars.",
        items: { type: "string" },
      },
      northStarKpis: {
        type: "array",
        description: "The north-star KPI names. 2-6 entries.",
        items: { type: "string" },
      },
      teamRoster: {
        type: "array",
        description: "Optional: list of role slugs / names to suggest as owners.",
        items: { type: "string" },
      },
    },
    required: ["priorWeekSummary", "northStarKpis"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const priorWeekSummary = String(args.priorWeekSummary).trim();
    const openCommitments = Array.isArray(args.openCommitments)
      ? (args.openCommitments as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 20)
      : [];
    const northStarKpis = Array.isArray(args.northStarKpis)
      ? (args.northStarKpis as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 6)
      : [];
    const teamRoster = Array.isArray(args.teamRoster)
      ? (args.teamRoster as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 30)
      : [];

    if (priorWeekSummary.length < MIN_PROMPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `priorWeekSummary too short (need ≥${MIN_PROMPT_LEN} chars).`,
      };
    }
    if (priorWeekSummary.length > MAX_PROMPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `priorWeekSummary too long (max ${MAX_PROMPT_LEN} chars).`,
      };
    }
    if (northStarKpis.length < 2) {
      return {
        ok: false,
        refused: true,
        reason: "northStarKpis must have at least 2 entries.",
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `weekly plan north star ${northStarKpis.join(" ")}`.slice(0, 300),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const systemPrompt = [
      "You are the General Manager preparing this week's plan.",
      "Output STRICT JSON: { headline, bullets, kpiOwners, risks, oneSentenceMemo }.",
      "headline: 1 sentence theme for the week.",
      "bullets: array of EXACTLY 5 entries. Each entry: { kpi, action, owner, dueBy }.",
      "  - kpi MUST be one of the supplied northStarKpis.",
      "  - action ≤25 words.",
      "  - owner: a person / role; pick from teamRoster when supplied.",
      "  - dueBy: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'.",
      "kpiOwners: array of { kpi, owner, sla } — one per northStarKpi.",
      "risks: 1-3 risk strings — the things that could derail the week.",
      "oneSentenceMemo: tweet-length summary the operator could screenshot.",
      "DO NOT pad to 5 bullets with filler. If you can only justify 4 substantive items, repeat the most important KPI for #5 with a follow-up action.",
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const userContent = [
      `northStarKpis: ${northStarKpis.join(", ")}`,
      teamRoster.length > 0 ? `teamRoster: ${teamRoster.join(", ")}` : "",
      openCommitments.length > 0
        ? `openCommitments:\n${openCommitments.map((c) => `  - ${c}`).join("\n")}`
        : "",
      "",
      "priorWeekSummary:",
      priorWeekSummary,
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
        max_tokens: 1100,
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

      const rawBullets = Array.isArray(parsed.bullets)
        ? (parsed.bullets as Array<Record<string, unknown>>)
        : [];
      // Filter bullets where kpi isn't in the operator's KPI set.
      const normalisedBullets = rawBullets
        .map((b) => ({
          kpi: typeof b.kpi === "string" ? b.kpi : "",
          action: typeof b.action === "string" ? b.action : "",
          owner: typeof b.owner === "string" ? b.owner : "",
          dueBy: typeof b.dueBy === "string" ? b.dueBy : "",
        }))
        .filter((b) => northStarKpis.includes(b.kpi))
        .slice(0, 5);

      await logSecurityEvent({
        kind: "gm.weekly.planned",
        tenantId: ctx.tenantId,
        payload: {
          subject: "gm.weekly.planned",
          kpiCount: northStarKpis.length,
          bulletsCount: normalisedBullets.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          headline: typeof parsed.headline === "string" ? parsed.headline : "",
          bullets: normalisedBullets,
          kpiOwners: Array.isArray(parsed.kpiOwners)
            ? (parsed.kpiOwners as Array<Record<string, unknown>>)
            : [],
          risks: Array.isArray(parsed.risks)
            ? (parsed.risks as string[])
            : [],
          oneSentenceMemo:
            typeof parsed.oneSentenceMemo === "string"
              ? parsed.oneSentenceMemo
              : "",
          northStarKpis,
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Weekly plan failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
