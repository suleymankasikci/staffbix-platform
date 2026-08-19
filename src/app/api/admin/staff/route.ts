import { NextResponse, type NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { staff } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";
import {
  getClientIp,
  getUserAgent,
  normalizeEmail,
  readJson,
} from "@/lib/auth/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/staff
 *
 * Returns every platform staff member. Newest first; cap at 500 since
 * platform staff lists never grow that large.
 *
 * POST /api/admin/staff
 *
 * Direct insert. Sprint 19 replaces this with an invitation flow (issue
 * a one-time token + send email + accept on first login). For Sprint 15
 * we land the table read/write so the team page works against real data.
 *
 * Audit kind is `staff.invited` (Sprint 17 enum,
 * drizzle/0013_sprint17.sql).
 */

type RoleVal = "owner" | "engineer" | "support" | "analyst";
type StatusVal = "active" | "invited" | "suspended";

const VALID_ROLE = new Set<RoleVal>(["owner", "engineer", "support", "analyst"]);
const VALID_STATUS = new Set<StatusVal>(["active", "invited", "suspended"]);

export async function GET(): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "GET /api/admin/staff",
  });
  if (t) return t;

  const rows = await db
    .select({
      id: staff.id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
      status: staff.status,
      lastSeenAt: staff.lastSeenAt,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
    })
    .from(staff)
    .orderBy(desc(staff.createdAt))
    .limit(500);

  return NextResponse.json({
    staff: rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
      status: r.status,
      lastSeenAt: r.lastSeenAt?.toISOString() ?? null,
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
    route: "POST /api/admin/staff",
  });
  if (t) return t;

  const body = await readJson<{
    email?: unknown;
    name?: unknown;
    role?: unknown;
    status?: unknown;
  }>(req);
  if (!body) {
    return NextResponse.json({ error: "Body required" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (body.name.length > 200) {
    return NextResponse.json({ error: "name too long" }, { status: 400 });
  }
  const role: RoleVal =
    typeof body.role === "string" && VALID_ROLE.has(body.role as RoleVal)
      ? (body.role as RoleVal)
      : "support";
  const status: StatusVal =
    typeof body.status === "string" && VALID_STATUS.has(body.status as StatusVal)
      ? (body.status as StatusVal)
      : "invited";

  try {
    const [row] = await db
      .insert(staff)
      .values({ email, name: body.name.trim(), role, status })
      .returning({ id: staff.id })
      .onConflictDoNothing({ target: staff.email });

    if (!row) {
      return NextResponse.json(
        { error: "A staff member with that email already exists." },
        { status: 409 },
      );
    }

    await logSecurityEvent({
      kind: "staff.invited",
      userId: session.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        subject: "staff.invited",
        staffId: row.id,
        email,
        role,
        status,
      },
    });

    return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
  } catch (err) {
    console.error("[admin.staff.post] failed", err);
    return NextResponse.json(
      { error: "Could not create staff member." },
      { status: 500 },
    );
  }
}
