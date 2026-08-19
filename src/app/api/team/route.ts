import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/team
 *
 * Members of the caller's tenant. Available to every signed-in user
 * (Owner/Admin/Editor/Reviewer all see the team) — write actions
 * (invite/revoke) are gated separately.
 *
 * Output is shaped for the existing /app/[lang]/app/team UI which
 * expects { initials, displayName, role, status, lastSeen } per row.
 */

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function lastSeenLabel(d: Date | null): string {
  if (!d) return "—";
  const diffH = (Date.now() - d.getTime()) / 3600_000;
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${Math.round(diffH)}h ago`;
  return `${Math.round(diffH / 24)}d ago`;
}

export async function GET(): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "GET /api/team",
  });
  if (t) return t;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.tenantId, session.tenantId))
    .orderBy(desc(users.createdAt))
    .limit(500);

  const out = rows.map((u) => ({
    id: u.id,
    initials: initialsOf(u.name),
    displayName: u.name,
    email: u.email,
    role: u.role.toLowerCase(),
    status: u.status === "Banned" ? "removed" : u.status.toLowerCase(),
    lastSeen: lastSeenLabel(u.lastLoginAt),
  }));

  return NextResponse.json({ members: out });
}
