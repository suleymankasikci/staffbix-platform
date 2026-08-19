import { NextResponse, type NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { announcements } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";
import { getClientIp, getUserAgent, readJson } from "@/lib/auth/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/announcements
 *
 * Returns the most recent 500 announcements, newest first. The customer
 * widget reads a narrower projection (only `status = live` + audience
 * filter) from a dedicated endpoint; this view is staff-only.
 *
 * POST /api/admin/announcements
 *
 * Create a new announcement row. Status defaults to "draft"; callers can
 * publish directly by passing `status: "live"` or "scheduled" alongside
 * the start/end timestamps.
 *
 * Audit kind is `announcement.created` (Sprint 17 enum,
 * drizzle/0013_sprint17.sql).
 */

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

export async function GET(): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "GET /api/admin/announcements",
  });
  if (t) return t;

  const rows = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      audience: announcements.audience,
      severity: announcements.severity,
      status: announcements.status,
      startsAt: announcements.startsAt,
      endsAt: announcements.endsAt,
      createdBy: announcements.createdBy,
      createdAt: announcements.createdAt,
      updatedAt: announcements.updatedAt,
    })
    .from(announcements)
    .orderBy(desc(announcements.createdAt))
    .limit(500);

  return NextResponse.json({
    announcements: rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      audience: r.audience,
      severity: r.severity,
      status: r.status,
      startsAt: r.startsAt?.toISOString() ?? null,
      endsAt: r.endsAt?.toISOString() ?? null,
      createdBy: r.createdBy,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "POST /api/admin/announcements",
  });
  if (t) return t;

  const body = await readJson<{
    title?: string;
    body?: string;
    audience?: string;
    severity?: string;
    status?: string;
    startsAt?: string | null;
    endsAt?: string | null;
  }>(req);
  if (!body || typeof body.title !== "string" || typeof body.body !== "string") {
    return NextResponse.json(
      { error: "title and body are required" },
      { status: 400 },
    );
  }
  const title = body.title.trim();
  const bodyText = body.body.trim();
  if (!title || !bodyText) {
    return NextResponse.json(
      { error: "title and body must not be empty" },
      { status: 400 },
    );
  }
  if (title.length > 200 || bodyText.length > 4000) {
    return NextResponse.json({ error: "Field too long" }, { status: 400 });
  }

  const audience: AudienceVal =
    body.audience && VALID_AUDIENCE.has(body.audience as AudienceVal)
      ? (body.audience as AudienceVal)
      : "all";
  const severity: SeverityVal =
    body.severity && VALID_SEVERITY.has(body.severity as SeverityVal)
      ? (body.severity as SeverityVal)
      : "info";
  const status: StatusVal =
    body.status && VALID_STATUS.has(body.status as StatusVal)
      ? (body.status as StatusVal)
      : "draft";

  const startsAt = parseDate(body.startsAt);
  const endsAt = parseDate(body.endsAt);
  if (startsAt === undefined && body.startsAt !== undefined) {
    return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
  }
  if (endsAt === undefined && body.endsAt !== undefined) {
    return NextResponse.json({ error: "Invalid endsAt" }, { status: 400 });
  }

  try {
    const [row] = await db
      .insert(announcements)
      .values({
        title,
        body: bodyText,
        audience,
        severity,
        status,
        startsAt: startsAt ?? null,
        endsAt: endsAt ?? null,
        createdBy: session.user.id,
      })
      .returning({ id: announcements.id });

    await logSecurityEvent({
      kind: "announcement.created",
      userId: session.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        subject: "announcement.created",
        announcementId: row!.id,
        title,
        audience,
        severity,
        status,
      },
    });

    return NextResponse.json({ ok: true, id: row!.id }, { status: 201 });
  } catch (err) {
    console.error("[admin.announcements.post] failed", err);
    return NextResponse.json(
      { error: "Could not create announcement." },
      { status: 500 },
    );
  }
}
