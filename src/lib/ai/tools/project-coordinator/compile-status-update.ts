import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * compile_status_update — produce a structured daily status update.
 * Output JSON:
 *   - headline (1 sentence)
 *   - shipped: [{ taskId, title, owner }]
 *   - inProgress: [{ taskId, title, owner, etaIso? }]
 *   - blockers: [{ taskId, title, owner, blockedHours }]
 *   - next24h: 1-5 strings
 *   - risks: 0-3 strings
 *   - oneSentenceMemo
 *
 * The model NEVER invents tasks not in the input. The operator owns
 * the actual posting to the channel — this is a draft only.
 */

const MODEL = "gpt-4o-mini";

const MIN_TASKS = 1;
const MAX_TASKS = 200;

export const compileStatusUpdateTool: Tool = {
  name: "compile_status_update",
  description:
    "Compile a daily project status update from the supplied task list. NEVER invents tasks. Returns structured JSON for the operator to post.",
  parameters: {
    type: "object",
    properties: {
      projectName: { type: "string" },
      audience: {
        type: "string",
        description: "Free-form audience tag (e.g., 'execs', 'engineering', 'all-hands'). ≤40 chars.",
      },
      tasksShipped: {
        type: "array",
        description: "0-50 tasks shipped today.",
        items: {
          type: "object",
          properties: {
            taskId: { type: "string" },
            title: { type: "string" },
            owner: { type: "string" },
          },
        },
      },
      tasksInProgress: {
        type: "array",
        description: "0-100 tasks in progress.",
        items: {
          type: "object",
          properties: {
            taskId: { type: "string" },
            title: { type: "string" },
            owner: { type: "string" },
            etaIso: { type: "string" },
          },
        },
      },
      tasksBlocked: {
        type: "array",
        description: "0-50 blocked tasks.",
        items: {
          type: "object",
          properties: {
            taskId: { type: "string" },
            title: { type: "string" },
            owner: { type: "string" },
            blockedHours: { type: "integer", minimum: 0, maximum: 8760 },
          },
        },
      },
      operatorNotes: {
        type: "string",
        description: "Optional free-form context (e.g., 'execs care about TrustCo timeline'). ≤500 chars.",
      },
    },
    required: ["projectName", "audience"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const projectName = String(args.projectName).trim();
    const audience = String(args.audience).trim().slice(0, 40);
    const shipped = Array.isArray(args.tasksShipped)
      ? (args.tasksShipped as Array<Record<string, unknown>>).slice(0, 50)
      : [];
    const inProgress = Array.isArray(args.tasksInProgress)
      ? (args.tasksInProgress as Array<Record<string, unknown>>).slice(0, 100)
      : [];
    const blocked = Array.isArray(args.tasksBlocked)
      ? (args.tasksBlocked as Array<Record<string, unknown>>).slice(0, 50)
      : [];
    const operatorNotes = args.operatorNotes
      ? String(args.operatorNotes).trim().slice(0, 500)
      : "";

    if (projectName.length < 2) {
      return { ok: false, refused: true, reason: "projectName too short." };
    }
    if (audience.length < 2) {
      return { ok: false, refused: true, reason: "audience too short." };
    }
    const totalTasks = shipped.length + inProgress.length + blocked.length;
    if (totalTasks < MIN_TASKS) {
      return {
        ok: false,
        refused: true,
        reason: "at least one task across shipped / inProgress / blocked is required.",
      };
    }
    if (totalTasks > MAX_TASKS) {
      return {
        ok: false,
        refused: true,
        reason: `too many tasks (max ${MAX_TASKS}).`,
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `status update voice ${projectName}`.slice(0, 200),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const renderList = (items: Array<Record<string, unknown>>) =>
      items
        .map(
          (t) =>
            `${t.taskId ?? ""} | ${t.title ?? ""} | owner=${t.owner ?? "unassigned"}${
              t.etaIso ? ` | eta=${t.etaIso}` : ""
            }${
              typeof t.blockedHours === "number" ? ` | blocked=${t.blockedHours}h` : ""
            }`,
        )
        .join("\n");

    const systemPrompt = [
      "You are the Project Coordinator drafting a daily status update.",
      "Output STRICT JSON: { headline, shipped, inProgress, blockers, next24h, risks, oneSentenceMemo }.",
      "headline: 1 sentence project pulse.",
      "shipped/inProgress/blockers: pass-through arrays from input — preserve taskId + title + owner verbatim, dropping any that aren't real.",
      "next24h: 1-5 strings — concrete actions for tomorrow.",
      "risks: 0-3 strings — open risks worth flagging.",
      "oneSentenceMemo: tweet-length summary the operator could screenshot.",
      "ABSOLUTE RULES:",
      "  - NEVER invent tasks, owners, or task IDs.",
      "  - NEVER promise delivery dates beyond what's in inProgress[].etaIso.",
      `Audience: ${audience}.`,
      operatorNotes ? `Operator notes: ${operatorNotes}` : "",
      "Brand Bible context:",
      bbBlock,
    ]
      .filter(Boolean)
      .join("\n");

    const userContent = [
      `projectName: ${projectName}`,
      "",
      "tasksShipped:",
      renderList(shipped) || "  (none)",
      "",
      "tasksInProgress:",
      renderList(inProgress) || "  (none)",
      "",
      "tasksBlocked:",
      renderList(blocked) || "  (none)",
    ].join("\n");

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

      // Whitelist taskIds: only keep model entries whose taskId exists
      // in the original input.
      const inputIds = new Set(
        [...shipped, ...inProgress, ...blocked]
          .map((t) => String(t.taskId ?? ""))
          .filter((s) => s.length > 0),
      );
      const filterList = (val: unknown) =>
        Array.isArray(val)
          ? (val as Array<Record<string, unknown>>).filter((e) =>
              inputIds.has(String(e.taskId ?? "")),
            )
          : [];

      await logSecurityEvent({
        kind: "pc.status.compiled",
        tenantId: ctx.tenantId,
        payload: {
          subject: "pc.status.compiled",
          projectName,
          audience,
          shippedCount: shipped.length,
          inProgressCount: inProgress.length,
          blockedCount: blocked.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          projectName,
          audience,
          headline: typeof parsed.headline === "string" ? parsed.headline : "",
          shipped: filterList(parsed.shipped),
          inProgress: filterList(parsed.inProgress),
          blockers: filterList(parsed.blockers),
          next24h: Array.isArray(parsed.next24h)
            ? (parsed.next24h as string[]).slice(0, 5)
            : [],
          risks: Array.isArray(parsed.risks)
            ? (parsed.risks as string[]).slice(0, 3)
            : [],
          oneSentenceMemo:
            typeof parsed.oneSentenceMemo === "string"
              ? parsed.oneSentenceMemo
              : "",
          notForBroadcast:
            "Draft only. Operator owns the actual post to the channel.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Status compile failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
