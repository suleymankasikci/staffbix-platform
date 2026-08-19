import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * detect_project_blockers — deterministic blocker triage. Given task
 * states + a stale threshold, return:
 *   - blockersNeedingEscalation: [{ taskId, title, owner, blockedHours,
 *     ageBucket, recommendedAction }]
 *   - byOwner: { ownerName: { blockerCount, oldestHours } }
 *   - teamHealth: 'healthy' | 'watch' | 'unhealthy'
 *
 * Health bands:
 *   - healthy: < 2 blockers above threshold
 *   - watch:   2-4 blockers above threshold
 *   - unhealthy: ≥ 5 OR any blocker ≥ 3× threshold
 */

const TASK_STATUSES = [
  "todo",
  "in_progress",
  "blocked",
  "in_review",
  "done",
  "abandoned",
] as const;

const MAX_TASKS = 200;

export const detectProjectBlockersTool: Tool = {
  name: "detect_project_blockers",
  description:
    "Identify blocked tasks that need escalation, group by owner, and return team health. Pure rules — no LLM. Use this hourly during the operator's working window.",
  parameters: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        description: "1-200 task entries.",
        items: {
          type: "object",
          properties: {
            taskId: { type: "string" },
            title: { type: "string" },
            status: { type: "string", enum: TASK_STATUSES },
            owner: { type: "string" },
            blockedSinceIso: {
              type: "string",
              description: "ISO timestamp the task became blocked. Required for status=blocked.",
            },
          },
        },
      },
      blockerThresholdHours: {
        type: "integer",
        description: "Hours blocked before escalation kicks in. Default 24.",
        minimum: 1,
        maximum: 720,
      },
    },
    required: ["tasks"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const rawTasks = Array.isArray(args.tasks)
      ? (args.tasks as Array<Record<string, unknown>>)
      : [];
    const blockerThresholdHours = Math.max(
      1,
      Math.min(720, Math.round(Number(args.blockerThresholdHours ?? 24))),
    );

    if (rawTasks.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: "tasks required (at least one).",
      };
    }
    if (rawTasks.length > MAX_TASKS) {
      return {
        ok: false,
        refused: true,
        reason: `tasks too many (max ${MAX_TASKS}).`,
      };
    }

    type Blocker = {
      taskId: string;
      title: string;
      owner: string;
      blockedHours: number;
      ageBucket: "fresh" | "stale" | "very_stale";
      recommendedAction: string;
    };

    const blockers: Blocker[] = [];
    let totalBlocked = 0;
    let totalInProgress = 0;
    let totalDone = 0;

    for (let i = 0; i < rawTasks.length; i++) {
      const t = rawTasks[i];
      const taskId = String(t.taskId ?? "").trim();
      const title = String(t.title ?? "").trim();
      const status = String(t.status ?? "");
      const owner = String(t.owner ?? "unassigned").trim() || "unassigned";
      const blockedSinceIso = t.blockedSinceIso
        ? String(t.blockedSinceIso).trim()
        : "";

      if (taskId.length === 0) {
        return {
          ok: false,
          refused: true,
          reason: `tasks[${i}].taskId required.`,
        };
      }
      if (!(TASK_STATUSES as readonly string[]).includes(status)) {
        return {
          ok: false,
          refused: true,
          reason: `tasks[${i}].status must be one of: ${TASK_STATUSES.join(", ")}`,
        };
      }

      if (status === "in_progress") totalInProgress++;
      if (status === "done") totalDone++;
      if (status === "blocked") {
        totalBlocked++;
        if (!blockedSinceIso) {
          return {
            ok: false,
            refused: true,
            reason: `tasks[${i}] (blocked) requires blockedSinceIso.`,
          };
        }
        const sinceMs = Date.parse(blockedSinceIso);
        if (!Number.isFinite(sinceMs)) {
          return {
            ok: false,
            refused: true,
            reason: `tasks[${i}].blockedSinceIso invalid.`,
          };
        }
        const blockedHours = Math.max(
          0,
          Math.round((Date.now() - sinceMs) / 3_600_000),
        );
        if (blockedHours < blockerThresholdHours) continue;

        const ageBucket: Blocker["ageBucket"] =
          blockedHours >= blockerThresholdHours * 3
            ? "very_stale"
            : blockedHours >= blockerThresholdHours * 2
              ? "stale"
              : "fresh";

        const recommendedAction =
          ageBucket === "very_stale"
            ? `Escalate to operator + page owner ${owner} now.`
            : ageBucket === "stale"
              ? `Direct message ${owner} + offer to schedule unblock-it pair time.`
              : `Add comment + nudge ${owner} via async channel.`;

        blockers.push({
          taskId,
          title,
          owner,
          blockedHours,
          ageBucket,
          recommendedAction,
        });
      }
    }

    const byOwner: Record<string, { blockerCount: number; oldestHours: number }> =
      {};
    for (const b of blockers) {
      const entry = byOwner[b.owner] ?? { blockerCount: 0, oldestHours: 0 };
      entry.blockerCount += 1;
      entry.oldestHours = Math.max(entry.oldestHours, b.blockedHours);
      byOwner[b.owner] = entry;
    }

    const veryStaleCount = blockers.filter((b) => b.ageBucket === "very_stale").length;
    const teamHealth: "healthy" | "watch" | "unhealthy" =
      blockers.length >= 5 || veryStaleCount > 0
        ? "unhealthy"
        : blockers.length >= 2
          ? "watch"
          : "healthy";

    await logSecurityEvent({
      kind: "pc.blockers.detected",
      tenantId: ctx.tenantId,
      payload: {
        subject: "pc.blockers.detected",
        tasksTotal: rawTasks.length,
        blockersCount: blockers.length,
        teamHealth,
        veryStaleCount,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        tasksTotal: rawTasks.length,
        statusCounts: {
          blocked: totalBlocked,
          in_progress: totalInProgress,
          done: totalDone,
        },
        blockerThresholdHours,
        blockersNeedingEscalation: blockers.sort(
          (a, b) => b.blockedHours - a.blockedHours,
        ),
        byOwner,
        teamHealth,
        veryStaleCount,
      },
    };
  },
};
