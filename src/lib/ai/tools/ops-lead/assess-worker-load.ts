import { and, eq, gte, sql, count } from "drizzle-orm";
import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { workers, workerActions, conversations } from "@/lib/db/schema";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * assess_worker_load — survey every active worker in the tenant and
 * compute a load score. Load = recent activity volume (worker_actions
 * + open conversations) normalised against the configured capacity
 * for that role. Returns:
 *   - per-worker: { workerId, roleSlug, name, loadPct, isOverload,
 *       isCritical, recentActionCount, openConversationCount }
 *   - aggregate: { total, overloadCount, criticalCount, averageLoadPct }
 *   - suggestedRedistribution: pairs of (overloaded, idle) workers
 *     within the same roleSlug
 *
 * No LLM call — pure SQL + arithmetic. The Ops Lead runs this hourly
 * to detect bottlenecks before they hit customers.
 */

const ACTIONS_DEFAULT_CAPACITY = 25; // per role per windowHours; tunable per call
const WINDOW_HOURS_DEFAULT = 4;

export const assessWorkerLoadTool: Tool = {
  name: "assess_worker_load",
  description:
    "Compute load % per worker and flag overload (>= loadThresholdPct) and critical (>= criticalThresholdPct). Suggest redistribution within the same role when one worker is overloaded and another is idle. Run hourly.",
  parameters: {
    type: "object",
    properties: {
      windowHours: {
        type: "integer",
        description: "Trailing window in hours. Default 4.",
        minimum: 1,
        maximum: 168,
      },
      loadThresholdPct: {
        type: "integer",
        description: "Above this is 'overload'. Default 80.",
        minimum: 1,
        maximum: 100,
      },
      criticalThresholdPct: {
        type: "integer",
        description: "Above this is 'critical' — operator alert. Default 90.",
        minimum: 1,
        maximum: 100,
      },
      capacityPerWindow: {
        type: "integer",
        description:
          "Number of actions per worker per window that counts as 100% load. Default 25.",
        minimum: 1,
        maximum: 10_000,
      },
    },
    required: [],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const windowHours = Math.max(
      1,
      Math.min(168, Number(args.windowHours ?? WINDOW_HOURS_DEFAULT)),
    );
    const loadThresholdPct = Math.max(
      1,
      Math.min(100, Number(args.loadThresholdPct ?? 80)),
    );
    const criticalThresholdPct = Math.max(
      1,
      Math.min(100, Number(args.criticalThresholdPct ?? 90)),
    );
    const capacityPerWindow = Math.max(
      1,
      Math.min(10_000, Number(args.capacityPerWindow ?? ACTIONS_DEFAULT_CAPACITY)),
    );

    if (criticalThresholdPct < loadThresholdPct) {
      return {
        ok: false,
        refused: true,
        reason: "criticalThresholdPct must be ≥ loadThresholdPct.",
      };
    }

    const cutoff = new Date(Date.now() - windowHours * 3_600_000);

    try {
      // 1) recent worker_actions count per worker
      const actionsByWorker = await db
        .select({
          workerId: workerActions.workerId,
          actionCount: count(workerActions.id),
        })
        .from(workerActions)
        .where(
          and(
            eq(workerActions.tenantId, ctx.tenantId),
            gte(workerActions.createdAt, cutoff),
          ),
        )
        .groupBy(workerActions.workerId);

      // 2) open conversations per worker (open + awaiting_human are
      //    the active states; resolved + abandoned are terminal).
      const openConvByWorker = await db
        .select({
          workerId: conversations.workerId,
          openCount: count(conversations.id),
        })
        .from(conversations)
        .where(
          and(
            eq(conversations.tenantId, ctx.tenantId),
            sql`${conversations.status} IN ('open','awaiting_human')`,
          ),
        )
        .groupBy(conversations.workerId);

      // 3) worker roster
      const allWorkers = await db
        .select({
          id: workers.id,
          name: workers.name,
          roleSlug: workers.roleSlug,
          status: workers.status,
        })
        .from(workers)
        .where(
          and(
            eq(workers.tenantId, ctx.tenantId),
            sql`${workers.status} = 'active'`,
          ),
        );

      const actionMap = new Map<string, number>();
      for (const r of actionsByWorker) {
        if (r.workerId) actionMap.set(r.workerId, Number(r.actionCount ?? 0));
      }
      const convMap = new Map<string, number>();
      for (const r of openConvByWorker) {
        if (r.workerId) convMap.set(r.workerId, Number(r.openCount ?? 0));
      }

      const workerLoads = allWorkers.map((w) => {
        const actions = actionMap.get(w.id) ?? 0;
        const opens = convMap.get(w.id) ?? 0;
        // Combined load: actions count + opens count, normalised
        // against capacityPerWindow.
        const rawLoad = actions + opens;
        const loadPct = Math.round((rawLoad / capacityPerWindow) * 100);
        return {
          workerId: w.id,
          name: w.name ?? "",
          roleSlug: w.roleSlug,
          recentActionCount: actions,
          openConversationCount: opens,
          loadPct,
          isOverload: loadPct >= loadThresholdPct,
          isCritical: loadPct >= criticalThresholdPct,
        };
      });

      const total = workerLoads.length;
      const overloadCount = workerLoads.filter((w) => w.isOverload).length;
      const criticalCount = workerLoads.filter((w) => w.isCritical).length;
      const averageLoadPct =
        total === 0
          ? 0
          : Math.round(
              workerLoads.reduce((s, w) => s + w.loadPct, 0) / total,
            );

      // Redistribution suggestions within the same role
      const byRole: Record<string, typeof workerLoads> = {};
      for (const w of workerLoads) {
        (byRole[w.roleSlug] ||= []).push(w);
      }
      const suggestedRedistribution: Array<{
        roleSlug: string;
        from: { workerId: string; name: string; loadPct: number };
        to: { workerId: string; name: string; loadPct: number };
        suggestedTransferUnits: number;
      }> = [];
      for (const [roleSlug, group] of Object.entries(byRole)) {
        if (group.length < 2) continue;
        const overloaded = group.filter((w) => w.isOverload);
        const idle = group
          .filter((w) => w.loadPct < loadThresholdPct / 2)
          .sort((a, b) => a.loadPct - b.loadPct);
        for (const over of overloaded) {
          if (idle.length === 0) break;
          const tgt = idle.shift()!;
          const transferUnits = Math.max(
            1,
            Math.ceil(((over.loadPct - loadThresholdPct) / 100) * capacityPerWindow),
          );
          suggestedRedistribution.push({
            roleSlug,
            from: { workerId: over.workerId, name: over.name, loadPct: over.loadPct },
            to: { workerId: tgt.workerId, name: tgt.name, loadPct: tgt.loadPct },
            suggestedTransferUnits: transferUnits,
          });
        }
      }

      await logSecurityEvent({
        kind: "ops.load.assessed",
        tenantId: ctx.tenantId,
        payload: {
          subject: "ops.load.assessed",
          windowHours,
          totalWorkers: total,
          overloadCount,
          criticalCount,
          averageLoadPct,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          windowHours,
          loadThresholdPct,
          criticalThresholdPct,
          capacityPerWindow,
          workers: workerLoads,
          total,
          overloadCount,
          criticalCount,
          averageLoadPct,
          suggestedRedistribution,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Load assessment failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
