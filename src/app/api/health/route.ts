import { NextResponse } from "next/server";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db/client";
import { redis } from "@/lib/queue/redis";
import { r2, R2_BUCKET } from "@/lib/storage/r2";
import { stripe } from "@/lib/stripe/client";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public liveness probe — never authenticated.
 *
 * Pings every external dependency in parallel with a 2-second cap, then
 * returns a single JSON snapshot the public `/status` page renders. Each
 * check is wrapped in `Promise.race` against a timeout so a hung upstream
 * never holds the response thread.
 *
 * Hard rule: ALWAYS returns 200. Even when every dependency is offline,
 * the status page must render the failure state — otherwise our own
 * status page goes down with us.
 */

const CHECK_TIMEOUT_MS = 2_000;

type CheckResult = {
  ok: boolean;
  latencyMs: number;
  error?: string;
};

type HealthResponse = {
  ok: boolean;
  checks: {
    postgres: CheckResult;
    redis: CheckResult;
    stripe: CheckResult;
    openai: CheckResult;
    r2: CheckResult;
  };
  timestamp: string;
  version: string;
};

function timeoutCheck(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`timeout after ${ms}ms`)),
      ms,
    ),
  );
}

async function timed(
  fn: () => Promise<unknown>,
): Promise<CheckResult> {
  const start = Date.now();
  try {
    await Promise.race([fn(), timeoutCheck(CHECK_TIMEOUT_MS)]);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: message.slice(0, 200),
    };
  }
}

async function checkPostgres(): Promise<CheckResult> {
  return timed(async () => {
    await db.execute(sql`select 1`);
  });
}

async function checkRedis(): Promise<CheckResult> {
  return timed(async () => {
    const reply = await redis.ping();
    if (reply !== "PONG") throw new Error(`unexpected ping reply: ${reply}`);
  });
}

async function checkStripe(): Promise<CheckResult> {
  return timed(async () => {
    // balance.retrieve works in test mode and exercises auth + network
    // without any side effects.
    await stripe.balance.retrieve();
  });
}

async function checkOpenAI(): Promise<CheckResult> {
  return timed(async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    } finally {
      clearTimeout(t);
    }
  });
}

async function checkR2(): Promise<CheckResult> {
  return timed(async () => {
    await r2.send(new HeadBucketCommand({ Bucket: R2_BUCKET }));
  });
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const [postgres, redisRes, stripeRes, openaiRes, r2Res] =
    await Promise.all([
      checkPostgres(),
      checkRedis(),
      checkStripe(),
      checkOpenAI(),
      checkR2(),
    ]);

  const checks = {
    postgres,
    redis: redisRes,
    stripe: stripeRes,
    openai: openaiRes,
    r2: r2Res,
  };

  const ok =
    postgres.ok &&
    redisRes.ok &&
    stripeRes.ok &&
    openaiRes.ok &&
    r2Res.ok;

  const body: HealthResponse = {
    ok,
    checks,
    timestamp: new Date().toISOString(),
    version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
  };

  // Always 200 — even when ok=false. Status pages cannot 500 themselves.
  return NextResponse.json(body, { status: 200 });
}
