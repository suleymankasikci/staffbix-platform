import { eq, and, gt, isNull } from "drizzle-orm";
import { db } from "../db/client";
import { invitations, users, tenants } from "../db/schema";
import type { Invitation } from "../db/schema";
import { generateVerificationToken, hashToken } from "./tokens";
import { hashPassword } from "./password";
import { checkTeamSeatsCap } from "../billing/limits";

const INVITATION_TTL_MS = 14 * 24 * 60 * 60_000; // 14 days

export type InvitationRole = "Admin" | "Editor" | "Reviewer";

/**
 * Issue an invitation. Returns the plaintext token to embed in the
 * email URL. The token is only ever stored hashed.
 *
 * If a *pending* invite already exists for (tenant, email), it is
 * revoked first — keeps the unique partial index happy and avoids the
 * "two open invites" footgun.
 */
export async function createInvitation(args: {
  tenantId: string;
  invitedBy: string;
  email: string;
  role: InvitationRole;
}): Promise<{ token: string; invitation: Invitation }> {
  const email = args.email.trim().toLowerCase();

  // Revoke any prior pending invite for this (tenant, email) so the
  // partial unique index doesn't reject the new row.
  await db
    .update(invitations)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(
      and(
        eq(invitations.tenantId, args.tenantId),
        eq(invitations.email, email),
        eq(invitations.status, "pending"),
      ),
    );

  const token = generateVerificationToken();
  const tokenHash = hashToken(token);

  const [invitation] = await db
    .insert(invitations)
    .values({
      tenantId: args.tenantId,
      invitedBy: args.invitedBy,
      email,
      role: args.role,
      tokenHash,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    })
    .returning();

  return { token, invitation };
}

export interface ResolvedInvitation {
  invitation: Invitation;
  tenant: typeof tenants.$inferSelect;
}

/**
 * Look up a pending invitation by its plaintext token. Returns null
 * if the invite is missing, consumed, revoked, or expired.
 */
export async function resolveInvitation(
  token: string,
): Promise<ResolvedInvitation | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const tokenHash = hashToken(token);

  const rows = await db
    .select({ invitation: invitations, tenant: tenants })
    .from(invitations)
    .innerJoin(tenants, eq(tenants.id, invitations.tenantId))
    .where(
      and(
        eq(invitations.tokenHash, tokenHash),
        eq(invitations.status, "pending"),
        gt(invitations.expiresAt, new Date()),
        isNull(invitations.acceptedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Accept an invitation: creates the user, links to the invitation,
 * marks the invitation accepted. Runs inside a transaction so a partial
 * failure leaves nothing committed.
 */
export async function acceptInvitation(args: {
  token: string;
  name: string;
  password: string;
}): Promise<{ ok: true; userId: string; tenantId: string } | { ok: false; reason: string }> {
  const resolved = await resolveInvitation(args.token);
  if (!resolved) return { ok: false, reason: "invalid_or_expired" };

  const passwordHash = await hashPassword(args.password);
  const name = args.name.trim();
  if (!name) return { ok: false, reason: "name_required" };

  // Re-check seat cap at acceptance time. The cap is also enforced at
  // INVITE time, but the tenant could have downgraded between invite
  // and acceptance — refusing here keeps `users + pending invites`
  // honest against `plan.maxTeamSeats`.
  const seatsCheck = await checkTeamSeatsCap({
    tenantId: resolved.tenant.id,
    // The pending invitation is already counted in `current` — we're
    // about to flip it to "accepted" (still counts as a seat) so don't
    // add another.
    pending: 0,
  });
  if (!seatsCheck.ok) return { ok: false, reason: "plan_limit_team_seats" };

  try {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          tenantId: resolved.tenant.id,
          email: resolved.invitation.email,
          passwordHash,
          name,
          locale: resolved.tenant.locale,
          role: resolved.invitation.role,
          status: "Active",
          emailVerifiedAt: new Date(),
        })
        .returning();

      await tx
        .update(invitations)
        .set({
          status: "accepted",
          acceptedAt: new Date(),
          acceptedUserId: user.id,
        })
        .where(eq(invitations.id, resolved.invitation.id));

      return { user };
    });
    return { ok: true, userId: result.user.id, tenantId: resolved.tenant.id };
  } catch (e: unknown) {
    const err = e as { cause?: { code?: string }; code?: string };
    const code = err.cause?.code ?? err.code;
    if (code === "23505") return { ok: false, reason: "email_already_member" };
    console.error("[invitations] accept tx failed:", e);
    return { ok: false, reason: "internal" };
  }
}

export async function revokeInvitation(args: {
  tenantId: string;
  invitationId: string;
}): Promise<boolean> {
  const rows = await db
    .update(invitations)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(
      and(
        eq(invitations.id, args.invitationId),
        eq(invitations.tenantId, args.tenantId),
        eq(invitations.status, "pending"),
      ),
    )
    .returning({ id: invitations.id });
  return rows.length === 1;
}

export async function listPendingInvitations(
  tenantId: string,
): Promise<Invitation[]> {
  return db
    .select()
    .from(invitations)
    .where(
      and(eq(invitations.tenantId, tenantId), eq(invitations.status, "pending")),
    );
}
