import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { announcements } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";
import { getClientIp, getUserAgent, readJson } from "@/lib/auth/request";
import { UUID_RE } from "@/lib/admin-routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

type AudienceVal = "all" | "free_trial" | "paid" | "enterprise";
type SeverityVal = "info" | "notice" | "critical";
type StatusVal = "draft" | "scheduled" | "live" | "ended";

const VALID_AUDIENCE = new Set<AudienceVal>([
  "all",
  "free_trial",
  "paid",
  "enterprise",
]);
const VALID_SEVERITY = new Set<SeverityVal>(["info", "notice", "critical"]);
const VALID_STATUS = new Set<StatusVal>(["draft", "scheduled", "live", "ended"]);

function parseDate(v: unknown): Date | null | undefined {
  if (v === null) return null;
  if (v === undefined) return undefined;
  if (typeof v !== "string") return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

/**
 * PATCH /api/admin/announcements/[id]
 *
 * Update any subset of the announcement's editable fields. Audit rows
 * use the dedicated `announcement.updated` kind (Sprint 17,
 * drizzle/0013_sprint17.sql).
 *
 * DELETE /api/admin/announcements/[id]
 *
 * Hard delete — there is no soft-delete column on this table. The audit
 * row captures enough of the deleted row to reconstruct it if needed.
 */
export async function PATCH(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "PATCH /api/admin/announcements/[id]",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid announcement id" }, { status: 400 });
  }

  const body = await readJson<{
    title?: string;
    body?: string;
    audience?: string;
    severity?: string;
    status?: string;
    startsAt?: string | null;
    endsAt?: string | null;
  }>(req);
  if (
    !body ||
    (body.title === undefined &&
      body.body === undefined &&
      body.audience === undefined &&
      body.severity === undefined &&
      body.status === undefined &&
      body.startsAt === undefined &&
      body.endsAt === undefined)
  ) {
    return NextResponse.json(
      { error: "Provide at least one field to update" },
      { status: 400 },
    );
  }

  if (
    body.audience !== undefined &&
    !VALID_AUDIENCE.has(body.audience as AudienceVal)
  ) {
    return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
  }
  if (
    body.severity !== undefined &&
    !VALID_SEVERITY.has(body.severity as SeverityVal)
  ) {
    return NextResponse.json({ error: "Invalid severity" }, { status: 400 });
  }
  if (
    body.status !== undefined &&
    !VALID_STATUS.has(body.status as StatusVal)
  ) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      return NextResponse.json({ error: "Invalid title" }, { status: 400 });
    }
    if (body.title.length > 200) {
      return NextResponse.json({ error: "title too long" }, { status: 400 });
    }
  }
  if (body.body !== undefined) {
    if (typeof body.body !== "string" || body.body.trim().length === 0) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    if (body.body.length > 4000) {
      return NextResponse.json({ error: "body too long" }, { status: 400 });
    }
  }
  const startsAt = parseDate(body.startsAt);
  const endsAt = parseDate(body.endsAt);
  if (startsAt === undefined && body.startsAt !== undefined) {
    return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
  }
  if (endsAt === undefined && body.endsAt !== undefined) {
    return NextResponse.json({ error: "Invalid endsAt" }, { status: 400 });
  }

  try {
    const [current] = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        status: announcements.status,
      })
      .from(announcements)
      .where(eq(announcements.id, id))
      .limit(1);
    if (!current) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    const patch: Partial<{
      title: string;
      body: string;
      audience: AudienceVal;
      severity: SeverityVal;
      status: StatusVal;
      startsAt: Date | null;
      endsAt: Date | null;
      updatedAt: Date;
    }> = { updatedAt: new Date() };

    if (body.title !== undefined) patch.title = body.title.trim();
    if (body.body !== undefined) patch.body = body.body.trim();
    if (body.audience !== undefined) patch.audience = body.audience as AudienceVal;
    if (body.severity !== undefined) patch.severity = body.severity as SeverityVal;
    if (body.status !== undefined) patch.status = body.status as StatusVal;
    if (body.startsAt !== undefined) patch.startsAt = startsAt ?? null;
    if (body.endsAt !== undefined) patch.endsAt = endsAt ?? null;

    await db.update(announcements).set(patch).where(eq(announcements.id, id));

    await logSecurityEvent({
      kind: "announcement.updated",
      userId: session.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        subject: "announcement.updated",
        announcementId: id,
        title: current.title,
        changes: patch,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin.announcements.patch] failed", err);
    return NextResponse.json(
      { error: "Could not update announcement." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "DELETE /api/admin/announcements/[id]",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid announcement id" }, { status: 400 });
  }

  try {
    const [current] = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        status: announcements.status,
      })
      .from(announcements)
      .where(eq(announcements.id, id))
      .limit(1);
    if (!current) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    await db.delete(announcements).where(eq(announcements.id, id));

    await logSecurityEvent({
      kind: "announcement.deleted",
      userId: session.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        subject: "announcement.deleted",
        announcementId: id,
        title: current.title,
        status: current.status,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin.announcements.delete] failed", err);
    return NextResponse.json(
      { error: "Could not delete announcement." },
      { status: 500 },
    );
  }
}
