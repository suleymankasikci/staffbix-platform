import { emailQueue } from "@/lib/queue/queues";
import type { Locale } from "@/lib/i18n/config";

/**
 * Five-touch onboarding drip scheduled in BullMQ.
 *
 * Each step is enqueued as a delayed job with a deterministic `jobId`
 * of `tenant:<tenantId>:drip:<step>`. BullMQ dedupes on jobId within
 * a queue, so re-running the signup flow (e.g. user re-completes OTP
 * after a crash, an admin resends the welcome sequence, etc.) will
 * NOT produce duplicate emails for the same tenant.
 *
 * The actual mail bodies are composed inside the worker — see
 * `src/worker/index.ts`. Keeping the bodies inline at the worker
 * level (rather than in the producer) lets us re-render copy and
 * tweak templates without breaking already-enqueued jobs.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export type DripStep = 1 | 2 | 3 | 4 | 5;

export interface DripJobData {
  kind: `drip_${DripStep}`;
  tenantId: string;
  to: string;
  userName: string;
  step: DripStep;
  locale: Locale;
}

export const DRIP_DELAYS_MS: Record<DripStep, number> = {
  1: 0, // day 0 — welcome
  2: 1 * DAY_MS, // day 1 — quickstart
  3: 3 * DAY_MS, // day 3 — first worker nudge
  4: 7 * DAY_MS, // day 7 — brand bible
  5: 14 * DAY_MS, // day 14 — feedback
};

export interface ScheduleOnboardingDripInput {
  tenantId: string;
  userEmail: string;
  userName: string;
  /** Recipient's locale — drip copy is rendered in this language. */
  locale?: Locale;
}

export interface ScheduleOnboardingDripResult {
  scheduled: number;
  /** Step indices that were already in the queue (idempotent re-run). */
  duplicate: DripStep[];
}

export async function scheduleOnboardingDrip(
  input: ScheduleOnboardingDripInput,
): Promise<ScheduleOnboardingDripResult> {
  const { tenantId, userEmail, userName, locale = "en" } = input;
  if (!tenantId) throw new Error("scheduleOnboardingDrip: tenantId required");
  if (!userEmail) throw new Error("scheduleOnboardingDrip: userEmail required");

  const steps: DripStep[] = [1, 2, 3, 4, 5];
  let scheduled = 0;
  const duplicate: DripStep[] = [];

  for (const step of steps) {
    // BullMQ disallows ':' in custom jobIds (it's the namespace separator
    // inside Redis keys). Use '-' instead while keeping the jobId fully
    // deterministic for dedupe.
    const jobId = `tenant-${tenantId}-drip-${step}`;

    // Explicit pre-check: BullMQ returns the existing job when you add
    // a duplicate jobId, but inspecting `job.timestamp` for drift fails
    // when both calls happen within the same wall-clock second. A
    // pre-flight `getJob` is one extra round trip but is reliable
    // regardless of clock granularity.
    const existing = await emailQueue.getJob(jobId);
    if (existing) {
      duplicate.push(step);
      continue;
    }

    const data: DripJobData = {
      kind: `drip_${step}` as `drip_${DripStep}`,
      tenantId,
      to: userEmail,
      userName,
      step,
      locale,
    };
    await emailQueue.add(`drip_${step}`, data, {
      jobId,
      delay: DRIP_DELAYS_MS[step],
    });
    scheduled++;
  }

  return { scheduled, duplicate };
}
