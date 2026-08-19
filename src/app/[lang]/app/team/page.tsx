"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { PageShell, Card, Badge } from "@/components/app/PageShell";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import {
  PlanLimitBanner,
  planLimitTone,
} from "@/components/app/PlanLimitBanner";
import { IconPlus, IconEdit, IconTrash } from "@/components/Icons";
import { useLocale } from "@/lib/i18n/client";
import { getAppTeamCopy } from "@/lib/i18n/page-copy";

interface SeatUsage {
  current: number;
  limit: number;
}

type TeamCopy = ReturnType<typeof getAppTeamCopy>;
type Role = keyof TeamCopy["roles"];
type MemberStatus = keyof TeamCopy["statuses"];

type Member = {
  id: string;
  initials: string;
  displayName: string;
  email: string;
  role: Role;
  status: MemberStatus;
  lastSeen: string;
};

type ApiMember = {
  id: string;
  initials: string;
  displayName: string;
  email: string;
  role: string;
  status: string;
  lastSeen: string;
};

const ROLE_KEYS: Role[] = ["owner", "admin", "editor", "reviewer"];
const STATUS_KEYS: MemberStatus[] = ["active", "invited"];

function coerceRole(raw: string): Role {
  return (ROLE_KEYS as string[]).includes(raw) ? (raw as Role) : "reviewer";
}

function coerceStatus(raw: string): MemberStatus {
  return (STATUS_KEYS as string[]).includes(raw)
    ? (raw as MemberStatus)
    : "active";
}

export default function TeamPage() {
  const locale = useLocale();
  const copy = getAppTeamCopy(locale);
  const roleKeys = Object.keys(copy.roles) as Role[];
  const assignableRoles = roleKeys.filter((r) => r !== "owner");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [seats, setSeats] = useState<SeatUsage | null>(null);
  const seatTone = seats ? planLimitTone(seats.current, seats.limit) : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/team", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setLoadError(`Failed to load team (HTTP ${res.status}).`);
          return;
        }
        const body = (await res.json()) as { members: ApiMember[] };
        if (!cancelled) {
          setMembers(
            (body.members ?? []).map((m) => ({
              id: m.id,
              initials: m.initials,
              displayName: m.displayName,
              email: m.email,
              role: coerceRole(m.role),
              status: coerceStatus(m.status),
              lastSeen: m.lastSeen,
            })),
          );
        }
      } catch {
        if (!cancelled) setLoadError("Network error loading team.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // Side fetch: seat usage from billing/me. Independent of team load
    // failure — if it errors we just don't render the banner.
    (async () => {
      try {
        const res = await fetch("/api/billing/me", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          usage?: { teamSeats?: { current: number; limit: number } };
        };
        if (!cancelled && json.usage?.teamSeats) {
          setSeats(json.usage.teamSeats);
        }
      } catch {
        // silent — banner just won't appear
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const target = removeId ? members.find((m) => m.id === removeId) : null;
  const editing = editId ? members.find((m) => m.id === editId) : null;
  const [mutating, setMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  function canonicalRole(role: Role): string {
    // POST /api/invitations + PATCH /api/team expect "Admin" / "Editor" /
    // "Reviewer"; the page model is lowercase.
    return role[0].toUpperCase() + role.slice(1);
  }

  async function invite(name: string, email: string, role: Role) {
    setMutating(true);
    setMutationError(null);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role: canonicalRole(role) }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        invitation?: { id: string; email: string; role: string };
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setMutationError(json.error ?? `Invite failed (HTTP ${res.status}).`);
        return;
      }
      // Optimistic prepend so the table reflects the pending invite
      // immediately — the GET refetch on next mount will reconcile.
      setMembers((ms) => [
        {
          id: json.invitation?.id ?? `inv_${Math.random().toString(36).slice(2, 8)}`,
          initials: (name
            .split(" ")
            .map((s) => s[0] ?? "")
            .join("")
            .toUpperCase() || email.slice(0, 2).toUpperCase()).slice(0, 2),
          displayName: name || email,
          email,
          role,
          status: "invited",
          lastSeen: copy.invitedToday,
        },
        ...ms,
      ]);
      setInviteOpen(false);
    } catch {
      setMutationError("Network error while inviting.");
    } finally {
      setMutating(false);
    }
  }

  async function updateRole(id: string, role: Role) {
    setMutating(true);
    setMutationError(null);
    try {
      const res = await fetch(`/api/team/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: canonicalRole(role) }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setMutationError(
          json.error ?? `Role update failed (HTTP ${res.status}).`,
        );
        return;
      }
      setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, role } : m)));
      setEditId(null);
    } catch {
      setMutationError("Network error updating role.");
    } finally {
      setMutating(false);
    }
  }

  async function remove() {
    if (!removeId) return;
    setMutating(true);
    setMutationError(null);
    try {
      const res = await fetch(`/api/team/${removeId}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setMutationError(json.error ?? `Remove failed (HTTP ${res.status}).`);
        return;
      }
      setMembers((ms) => ms.filter((m) => m.id !== removeId));
      setRemoveId(null);
    } catch {
      setMutationError("Network error removing member.");
    } finally {
      setMutating(false);
    }
  }

  return (
    <PageShell
      title={copy.title}
      description={copy.description}
      actions={
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          disabled={seatTone === "block"}
          title={
            seatTone === "block" && seats
              ? `${seats.current} / ${seats.limit}`
              : undefined
          }
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full bg-ink text-white hover:bg-ink/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <IconPlus width={13} height={13} />
          {copy.inviteMember}
        </button>
      }
    >
      {seats && seatTone && (
        <PlanLimitBanner
          tone={seatTone}
          title={
            seatTone === "block"
              ? copy.planLimit.blockTitle
              : copy.planLimit.warnTitle
          }
          body={
            seatTone === "block"
              ? copy.planLimit.blockBody
              : copy.planLimit.warnBody
          }
          hint={copy.planLimit.hint
            .replace("{current}", String(seats.current))
            .replace("{limit}", String(seats.limit))}
          cta={copy.planLimit.cta}
        />
      )}
      {mutationError && (
        <div
          role="alert"
          className="mb-4 px-4 py-3 rounded-md border border-[#B91C1C]/40 bg-[#FEF2F2] text-[12.5px] text-[#7F1D1D]"
        >
          {mutationError}
        </div>
      )}
      <Card padded={false} className="mb-6">
        <table className="w-full">
          <thead>
            <tr className="bg-canvas-soft/60 border-b border-rule text-left">
              <Th>{copy.table.member}</Th>
              <Th>{copy.table.role}</Th>
              <Th>{copy.table.status}</Th>
              <Th>{copy.table.lastSeen}</Th>
              <Th>{""}</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {members.map((m) => (
              <tr
                key={m.id}
                className="hover:bg-canvas-soft/50 transition-colors"
              >
                <Td>
                  <div className="flex items-center gap-3">
                    <span className="size-8 rounded-full bg-tint/60 border border-rule flex items-center justify-center font-mono text-[10px] font-medium text-ink shrink-0">
                      {m.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink">
                        {m.displayName}
                      </p>
                      <p className="text-[12px] text-ink-muted truncate">
                        {m.email}
                      </p>
                    </div>
                  </div>
                </Td>
                <Td>
                  <span className="text-[12.5px] text-ink">
                    {copy.roles[m.role].label}
                  </span>
                </Td>
                <Td>
                  <Badge tone={m.status === "active" ? "accent" : "soft"}>
                    {copy.statuses[m.status]}
                  </Badge>
                </Td>
                <Td>
                  <span className="text-[12px] text-ink-muted">
                    {m.lastSeen}
                  </span>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditId(m.id)}
                      disabled={m.role === "owner"}
                      className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label={copy.labels.editRole}
                    >
                      <IconEdit width={14} height={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoveId(m.id)}
                      disabled={m.role === "owner"}
                      className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-[#B91C1C] hover:bg-canvas-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label={copy.labels.removeMember}
                    >
                      <IconTrash width={14} height={14} />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        {(loading || loadError) && (
          <p className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            {loading ? "…" : loadError}
          </p>
        )}
      </Card>

      <Card>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-4">
          {copy.roleReference}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roleKeys.map((r) => (
            <div key={r} className="flex items-start gap-3">
              <Badge tone={r === "owner" ? "ink" : "neutral"}>
                {copy.roles[r].label}
              </Badge>
              <p className="text-[12.5px] text-ink-muted leading-[1.6] flex-1">
                {copy.roles[r].description}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <InviteModal
        copy={copy}
        roles={assignableRoles}
        open={inviteOpen}
        busy={mutating}
        onClose={() => setInviteOpen(false)}
        onInvite={invite}
      />

      <EditRoleModal
        copy={copy}
        roles={assignableRoles}
        member={editing}
        busy={mutating}
        onClose={() => setEditId(null)}
        onSave={updateRole}
      />

      <ConfirmModal
        open={Boolean(removeId)}
        onClose={() => setRemoveId(null)}
        onConfirm={remove}
        title={`${copy.remove.titlePrefix} ${target?.displayName}${copy.remove.titleSuffix}`}
        confirmLabel={copy.remove.confirm}
        tone="danger"
        body={
          <p>
            {copy.remove.bodyPrefix} {target?.displayName} ({target?.email}){" "}
            {copy.remove.bodyMiddle} {copy.remove.bodySuffix}
          </p>
        }
      />
    </PageShell>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft px-4 py-2.5 font-normal text-left">
      {children}
    </th>
  );
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3">{children}</td>;
}

function InviteModal({
  copy,
  roles,
  open,
  busy,
  onClose,
  onInvite,
}: {
  copy: TeamCopy;
  roles: Role[];
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onInvite: (name: string, email: string, role: Role) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label={copy.labels.close}
        onClick={onClose}
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
      />
      <div className="relative bg-card border border-rule rounded-[14px] w-full max-w-[480px] shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)]">
        <header className="px-6 pt-6 pb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-2">
            {copy.invite.eyebrow}
          </p>
          <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink">
            {copy.invite.title}
          </h2>
        </header>
        <div className="px-6 pb-5 flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
              {copy.invite.name}
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={copy.invite.namePlaceholder}
              className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
              {copy.invite.email}
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={copy.invite.emailPlaceholder}
              className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none"
            />
          </label>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-2">
              {copy.invite.role}
            </p>
            <RoleOptions
              copy={copy}
              roles={roles}
              role={role}
              setRole={setRole}
            />
          </div>
        </div>
        <footer className="px-6 py-4 border-t border-rule bg-canvas-soft/60 rounded-b-[14px] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
          >
            {copy.labels.cancel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => name && email && onInvite(name, email, role)}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors disabled:opacity-60"
          >
            {copy.invite.submit}
          </button>
        </footer>
      </div>
    </div>
  );
}

function EditRoleModal({
  copy,
  roles,
  member,
  busy,
  onClose,
  onSave,
}: {
  copy: TeamCopy;
  roles: Role[];
  member: Member | null | undefined;
  busy: boolean;
  onClose: () => void;
  onSave: (id: string, role: Role) => void;
}) {
  const [role, setRole] = useState<Role>(member?.role ?? "editor");

  if (!member) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label={copy.labels.close}
        onClick={onClose}
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
      />
      <div className="relative bg-card border border-rule rounded-[14px] w-full max-w-[440px] shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)]">
        <header className="px-6 pt-6 pb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-2">
            {copy.edit.eyebrow}
          </p>
          <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink">
            {member.displayName}
          </h2>
          <p className="text-[12.5px] text-ink-muted mt-1">{member.email}</p>
        </header>
        <div className="px-6 pb-5 flex flex-col gap-2">
          <RoleOptions
            copy={copy}
            roles={roles}
            role={role}
            setRole={setRole}
          />
        </div>
        <footer className="px-6 py-4 border-t border-rule bg-canvas-soft/60 rounded-b-[14px] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
          >
            {copy.labels.cancel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSave(member.id, role)}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors disabled:opacity-60"
          >
            {copy.edit.submit}
          </button>
        </footer>
      </div>
    </div>
  );
}

function RoleOptions({
  copy,
  roles,
  role,
  setRole,
}: {
  copy: TeamCopy;
  roles: Role[];
  role: Role;
  setRole: (role: Role) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {roles.map((r) => (
        <label
          key={r}
          className={`flex items-start justify-between gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${
            role === r
              ? "border-ink bg-canvas-soft"
              : "border-rule hover:border-ink/25"
          }`}
        >
          <div className="flex-1">
            <p className="text-[13px] font-medium text-ink">
              {copy.roles[r].label}
            </p>
            <p className="text-[11.5px] text-ink-muted">
              {copy.roles[r].description}
            </p>
          </div>
          <input
            type="radio"
            name="role"
            checked={role === r}
            onChange={() => setRole(r)}
            className="sr-only"
          />
          <span
            className={`mt-1 size-3.5 rounded-full border-2 ${
              role === r ? "border-ink bg-ink" : "border-rule"
            }`}
          />
        </label>
      ))}
    </div>
  );
}
