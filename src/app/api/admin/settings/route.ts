import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { platformSettings } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";
import { getClientIp, getUserAgent, readJson } from "@/lib/auth/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings
 *
 * Returns every key/value pair in the platform_settings table as a flat
 * `Record<string, unknown>`. The admin settings page hydrates a form
 * from this — unknown keys are ignored client-side.
 *
 * PUT /api/admin/settings
 *
 * UPSERT a single key. Body shape: `{ key: string, value: unknown }`.
 * Updates `updated_by`/`updated_at` on every write. Audit kind is
 * `settings.updated` (Sprint 17 enum, drizzle/0013_sprint17.sql).
 */

const KEY_RE = /^[a-z][a-z0-9_]{0,63}$/;

export async function GET(): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "GET /api/admin/settings",
  });
  if (t) return t;

  const rows = await db
    .select({
      key: platformSettings.key,
      value: platformSettings.value,
      updatedAt: platformSettings.updatedAt,
    })
    .from(platformSettings);

  const settings: Record<string, unknown> = {};
  for (const r of rows) settings[r.key] = r.value;

  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "PUT /api/admin/settings",
  });
  if (t) return t;

  const body = await readJson<{ key?: unknown; value?: unknown }>(req);
  if (!body || typeof body.key !== "string") {
    return NextResponse.json(
      { error: "key (string) is required" },
      { status: 400 },
    );
  }
  if (!KEY_RE.test(body.key)) {
    return NextResponse.json(
      { error: "key must match /^[a-z][a-z0-9_]{0,63}$/" },
      { status: 400 },
    );
  }
  if (body.value === undefined) {
    return NextResponse.json({ error: "value is required" }, { status: 400 });
  }

  try {
    // jsonb-friendly types: boolean | number | string | array | plain object.
    // Validate that the value can survive a round-trip through JSON.
    const serialized = JSON.stringify(body.value);
    if (serialized === undefined) {
      return NextResponse.json(
        { error: "value must be JSON-serializable" },
        { status: 400 },
      );
    }
    if (serialized.length > 32_768) {
      return NextResponse.json({ error: "value too large" }, { status: 400 });
    }

    await db
      .insert(platformSettings)
      .values({
        key: body.key,
        value: body.value as unknown,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: {
          value: body.value as unknown,
          updatedBy: session.user.id,
          updatedAt: sql`now()`,
        },
      });

    await logSecurityEvent({
      kind: "settings.updated",
      userId: session.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        subject: "settings.updated",
        key: body.key,
        value: body.value,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin.settings.put] failed", err);
    return NextResponse.json(
      { error: "Could not update setting." },
      { status: 500 },
    );
  }
}
