import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * evaluate_release_readiness — given test results + open bug counts +
 * coverage indicators, decide ship/block. Pure rules — no LLM.
 *
 * Block conditions (any one fires):
 *   - openP0Count > 0
 *   - openP1Count > p1Tolerance (default 0)
 *   - any required suite failed
 *   - any required suite was skipped
 *
 * Output:
 *   - decision: 'ship' | 'block' | 'ship_with_caveats'
 *   - blockingReasons[], advisoryReasons[]
 *   - suiteSummary[]
 *   - signOffBy: optional human handoff
 */

const SUITE_STATUSES = ["passed", "failed", "skipped", "in_progress"] as const;
const SUITE_TYPES = ["unit", "integration", "e2e", "visual", "performance", "security"] as const;

const MAX_SUITES = 20;

export const evaluateReleaseReadinessTool: Tool = {
  name: "evaluate_release_readiness",
  description:
    "Decide ship/block from test suite results + open P0/P1 bug counts. Pure rules. Returns blockingReasons + advisoryReasons + a suite summary.",
  parameters: {
    type: "object",
    properties: {
      releaseLabel: { type: "string" },
      suites: {
        type: "array",
        description: "1-20 entries of test suite results.",
        items: {
          type: "object",
          properties: {
            suiteType: { type: "string", enum: SUITE_TYPES },
            status: { type: "string", enum: SUITE_STATUSES },
            failureCount: { type: "integer", minimum: 0 },
            durationSec: { type: "integer", minimum: 0 },
            required: { type: "boolean" },
          },
        },
      },
      openP0Count: { type: "integer", minimum: 0, maximum: 10_000 },
      openP1Count: { type: "integer", minimum: 0, maximum: 10_000 },
      p1Tolerance: {
        type: "integer",
        description: "How many open P1 bugs we'll allow before blocking. Default 0.",
        minimum: 0,
        maximum: 100,
      },
      postReleaseWatchHours: {
        type: "integer",
        description: "Hours of post-release watch the operator commits to. Default 24.",
        minimum: 0,
        maximum: 168,
      },
    },
    required: ["releaseLabel", "suites", "openP0Count", "openP1Count"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const releaseLabel = String(args.releaseLabel).trim();
    const rawSuites = Array.isArray(args.suites)
      ? (args.suites as Array<Record<string, unknown>>)
      : [];
    const openP0Count = Math.max(0, Math.round(Number(args.openP0Count)));
    const openP1Count = Math.max(0, Math.round(Number(args.openP1Count)));
    const p1Tolerance = Math.max(0, Math.round(Number(args.p1Tolerance ?? 0)));
    const postReleaseWatchHours = Math.max(
      0,
      Math.min(168, Math.round(Number(args.postReleaseWatchHours ?? 24))),
    );

    if (releaseLabel.length < 2) {
      return { ok: false, refused: true, reason: "releaseLabel too short." };
    }
    if (rawSuites.length === 0 || rawSuites.length > MAX_SUITES) {
      return {
        ok: false,
        refused: true,
        reason: `suites must have 1-${MAX_SUITES} entries.`,
      };
    }

    const suites: Array<{
      suiteType: string;
      status: string;
      failureCount: number;
      durationSec: number;
      required: boolean;
    }> = [];
    for (let i = 0; i < rawSuites.length; i++) {
      const s = rawSuites[i];
      const suiteType = String(s.suiteType ?? "");
      const status = String(s.status ?? "");
      if (!(SUITE_TYPES as readonly string[]).includes(suiteType)) {
        return {
          ok: false,
          refused: true,
          reason: `suites[${i}].suiteType invalid: '${suiteType}'. Must be one of: ${SUITE_TYPES.join(", ")}`,
        };
      }
      if (!(SUITE_STATUSES as readonly string[]).includes(status)) {
        return {
          ok: false,
          refused: true,
          reason: `suites[${i}].status invalid: '${status}'. Must be one of: ${SUITE_STATUSES.join(", ")}`,
        };
      }
      suites.push({
        suiteType,
        status,
        failureCount: Math.max(0, Math.round(Number(s.failureCount ?? 0))),
        durationSec: Math.max(0, Math.round(Number(s.durationSec ?? 0))),
        required: s.required !== false,
      });
    }

    const blockingReasons: string[] = [];
    const advisoryReasons: string[] = [];

    if (openP0Count > 0) {
      blockingReasons.push(`${openP0Count} open P0 bug(s) — must be zero to ship.`);
    }
    if (openP1Count > p1Tolerance) {
      blockingReasons.push(
        `${openP1Count} open P1 bugs > tolerance (${p1Tolerance}).`,
      );
    } else if (openP1Count > 0) {
      advisoryReasons.push(
        `${openP1Count} open P1 bug(s) within tolerance (${p1Tolerance}).`,
      );
    }

    for (const s of suites) {
      if (s.status === "failed" && s.required) {
        blockingReasons.push(
          `required ${s.suiteType} suite FAILED (${s.failureCount} failure${s.failureCount === 1 ? "" : "s"}).`,
        );
      } else if (s.status === "failed") {
        advisoryReasons.push(
          `optional ${s.suiteType} suite failed — investigate but not blocking.`,
        );
      } else if (s.status === "skipped" && s.required) {
        blockingReasons.push(
          `required ${s.suiteType} suite SKIPPED — must run to clear release.`,
        );
      } else if (s.status === "skipped") {
        advisoryReasons.push(`optional ${s.suiteType} suite skipped.`);
      } else if (s.status === "in_progress") {
        blockingReasons.push(`${s.suiteType} suite still in_progress — wait for completion.`);
      }
    }

    if (postReleaseWatchHours < 1) {
      advisoryReasons.push(
        "postReleaseWatchHours = 0 — no operator commit to post-release monitoring.",
      );
    }

    let decision: "ship" | "block" | "ship_with_caveats";
    if (blockingReasons.length > 0) {
      decision = "block";
    } else if (advisoryReasons.length > 0) {
      decision = "ship_with_caveats";
    } else {
      decision = "ship";
    }

    const signOffBy =
      decision === "block"
        ? "QA Lead must lift the block."
        : decision === "ship_with_caveats"
          ? "QA Lead signs off + operator acknowledges advisoryReasons."
          : "Standard QA sign-off.";

    await logSecurityEvent({
      kind: "qa.release.evaluated",
      tenantId: ctx.tenantId,
      payload: {
        subject: "qa.release.evaluated",
        releaseLabel,
        decision,
        blockingReasonsCount: blockingReasons.length,
        advisoryReasonsCount: advisoryReasons.length,
        openP0Count,
        openP1Count,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        releaseLabel,
        decision,
        blockingReasons,
        advisoryReasons,
        suiteSummary: suites,
        openP0Count,
        openP1Count,
        p1Tolerance,
        postReleaseWatchHours,
        signOffBy,
      },
    };
  },
};
