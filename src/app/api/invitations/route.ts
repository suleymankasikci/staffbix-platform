import { type NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import {
  getClientIp,
  getUserAgent,
  readJson,
  normalizeEmail,
} from "@/lib/auth/request";
import { logSecurityEvent } from "@/lib/audit/log";
import {
  createInvitation,
  listPendingInvitations,
  type InvitationRole,
} from "@/lib/auth/invitations";
import { queueEmail, buildInvitationMessage } from "@/lib/mail/send";
import { normalizeLocale } from "@/lib/i18n/config";
import { checkTeamSeatsCap } from "@/lib/billing/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES = new Set<InvitationRole>(["Admin", "Editor", "Reviewer"]);

interface InviteBody {
  email?: string;
  role?: string;
}

/**
 * GET /api/invitations
 *
 * Pending invites for the caller's tenant. Owner + Admin only.
 */
export async function GET(): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "Owner" && session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "GET /api/invitations",
  });
  if (t) return t;

  const list = await listPendingInvitations(session.tenantId);
  // Strip token_hash from the response — never expose it, even to admins.
  const out = list.map(({ tokenHash: _t, ...rest }) => rest);
  return NextResponse.json({ invitations: out });
}

/**
 * POST /api/invitations
 *
 * Issue a new invite. Body: `{ email, role }`. Role must be one of
 * Admin / Editor / Reviewer — Owner is not invitable (single Owner per
 * tenant in MVP; transfer-ownership flow lands in Sprint 12).
 *
 * Re-invites the same email by revoking the prior pending invite first.
 *
 * Refuses if the email already belongs to a user of this tenant.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "Owner" && session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "POST /api/invitations",
  });
  if (t) return t;

  const body = await readJson<InviteBody>(req);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const email = normalizeEmail(body.email);
  if (!email) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });

  const role = typeof body.role === "string" ? body.role : "";
  if (!VALID_ROLES.has(role as InvitationRole)) {
    return NextResponse.json(
      { error: "Role must be Admin, Editor, or Reviewer." },
      { status: 400 },
    );
  }

  // Reject if this email already belongs to a member of THIS tenant.
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.tenantId, session.tenantId), eq(users.email, email)))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "This email already belongs to a team member." },
      { status: 409 },
    );
  }

  // Plan cap: refuse if active users + pending invitations + this one
  // would exceed `plan.maxTeamSeats`. Returns 402 so the client knows
  // to surface the upgrade-plan affordance, matching how the workers /
  // ai-spend caps are signalled.
  const seatsCheck = await checkTeamSeatsCap({
    tenantId: session.tenantId,
    pending: 1,
  });
  if (!seatsCheck.ok) {
    return NextResponse.json(
      {
        error: seatsCheck.reason,
        code: "plan_limit_team_seats",
        limit: seatsCheck.limit,
        current: seatsCheck.current,
      },
      { status: 402 },
    );
  }

  const { token, invitation } = await createInvitation({
    tenantId: session.tenantId,
    invitedBy: session.userId,
    email,
    role: role as InvitationRole,
  });

  // Build the accept URL using the tenant's locale (recipient will see
  // it in that language first; we don't know their preference yet).
  const baseUrl =
    process.env.PUBLIC_APP_URL ?? "http://localhost:3000";
  const acceptUrl = `${baseUrl}/${session.tenant.locale}/accept/${token}`;

  await queueEmail({
    idemKey: `invitation:${invitation.id}`,
    message: buildInvitationMessage({
      to: email,
      tenantName: session.tenant.name,
      inviterName: session.user.name,
      acceptUrl,
      ttlDays: 14,
      role: role,
      locale: normalizeLocale(session.tenant.locale) ?? "en",
    }),
    tenantId: session.tenantId,
    userId: session.userId,
  });

  await logSecurityEvent({
    kind: "tenant.invitation.created",
    tenantId: session.tenantId,
    userId: session.userId,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    payload: { invitationId: invitation.id, email, role },
  });

  // Strip the hash from the response.
  return NextResponse.json({
    ok: true,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
    },
  });
}
