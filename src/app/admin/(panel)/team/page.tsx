"use client";

import { useEffect, useState } from "react";
import {
  PageShell,
  Card,
  Badge,
} from "@/components/app/PageShell";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import { IconPlus, IconEdit, IconTrash, IconClose } from "@/components/Icons";

// Sprint 15: real /api/admin/staff backing. Sprint 19 layers an invite
// flow on top of POST /api/admin/staff — for now invitation === direct
// insert with status="invited".

type RoleVal = "owner" | "engineer" | "support" | "analyst";
type StatusVal = "active" | "invited" | "suspended";

interface ApiStaff {
  id: string;
  email: string;
  name: string;
  role: RoleVal;
  status: StatusVal;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const ROLE_LABEL: Record<RoleVal, string> = {
  owner: "Owner",
  engineer: "Engineer",
  support: "Support",
  analyst: "Analyst",
};
const STATUS_LABEL: Record<StatusVal, string> = {
  active: "Active",
  invited: "Invited",
  suspended: "Suspended",
};
const ROLE_DESC: Record<RoleVal, string> = {
  owner: "Full access. Manage staff, plans, tenant ops, finance.",
  engineer: "Catalog, integrations, feature flags, audit log.",
  support: "Tickets, impersonation, password resets.",
  analyst: "Read every page. No mutations.",
};
const INVITABLE_ROLES: RoleVal[] = ["engineer", "support", "analyst"];

function fmtLastSeen(iso: string | null): string {
  if (!iso) return "—";
  return iso.replace("T", " ").replace(/:\d{2}\.\d+Z$/, "Z");
}

export default function AdminTeamPage() {
  const [staff, setStaff] = useState<ApiStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const editing = editId ? staff.find((s) => s.id === editId) ?? null : null;
  const target = removeId ? staff.find((s) => s.id === removeId) ?? null : null;

  async function reload() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/staff", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        staff?: ApiStaff[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(data.error ?? "Couldn't load staff.");
        return;
      }
      setStaff(data.staff ?? []);
    } catch {
      setLoadError("Network error loading staff.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function invite(name: string, email: string, role: RoleVal) {
    setActionError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, status: "invited" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "Couldn't invite staff member.");
        return;
      }
      setInviteOpen(false);
      await reload();
    } catch {
      setActionError("Network error inviting staff.");
    } finally {
      setBusy(false);
    }
  }

  async function updateRole(id: string, role: RoleVal) {
    setActionError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "Couldn't update staff member.");
        return;
      }
      setEditId(null);
      await reload();
    } catch {
      setActionError("Network error updating staff.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!removeId) return;
    setActionError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/staff/${removeId}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "Couldn't remove staff member.");
        return;
      }
      setStaff((sf) => sf.filter((s) => s.id !== removeId));
      setRemoveId(null);
    } catch {
      setActionError("Network error removing staff.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell
      title="Staff team"
      description="People with access to this admin panel. Every action they take is recorded in the platform audit log."
      actions={
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
        >
          <IconPlus width={13} height={13} />
          Invite staff
        </button>
      }
    >
      {loadError && (
        <div className="mb-3 rounded-md border border-rule bg-canvas-soft px-3 py-2 text-[12.5px] text-[#B91C1C]">
          {loadError}
        </div>
      )}
      {actionError && (
        <div className="mb-3 rounded-md border border-rule bg-canvas-soft px-3 py-2 text-[12.5px] text-[#B91C1C]">
          {actionError}
        </div>
      )}

      <Card padded={false} className="mb-6">
        {loading && (
          <div className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            Loading…
          </div>
        )}
        <table className="w-full">
          <thead>
            <tr className="bg-canvas-soft/60 border-b border-rule text-left">
              <Th>Member</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Last seen</Th>
              <Th>{""}</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-canvas-soft/50 transition-colors">
                <Td>
                  <div className="flex items-center gap-3">
                    <span className="size-8 rounded-full bg-tint/60 border border-rule flex items-center justify-center font-mono text-[10px] font-medium text-ink shrink-0">
                      {s.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink truncate">{s.name}</p>
                      <p className="text-[12px] text-ink-muted truncate">{s.email}</p>
                    </div>
                  </div>
                </Td>
                <Td>
                  <Badge tone={s.role === "owner" ? "ink" : "neutral"}>{ROLE_LABEL[s.role]}</Badge>
                </Td>
                <Td>
                  <Badge tone={s.status === "active" ? "accent" : s.status === "invited" ? "soft" : "neutral"}>
                    {STATUS_LABEL[s.status]}
                  </Badge>
                </Td>
                <Td>
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">{fmtLastSeen(s.lastSeenAt)}</span>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditId(s.id)}
                      disabled={s.role === "owner" || busy}
                      className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft disabled:opacity-40 transition-colors"
                      aria-label="Edit"
                    >
                      <IconEdit width={14} height={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoveId(s.id)}
                      disabled={s.role === "owner" || busy}
                      className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-[#B91C1C] hover:bg-canvas-soft disabled:opacity-40 transition-colors"
                      aria-label="Remove"
                    >
                      <IconTrash width={14} height={14} />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && staff.length === 0 && !loadError && (
          <div className="px-5 py-4 text-[13px] text-ink-muted">No staff members yet.</div>
        )}
      </Card>

      <Card>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-4">Role reference</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(["owner", "engineer", "support", "analyst"] as RoleVal[]).map((r) => (
            <div key={r} className="flex items-start gap-3">
              <Badge tone={r === "owner" ? "ink" : "neutral"}>{ROLE_LABEL[r]}</Badge>
              <p className="text-[12.5px] text-ink-muted leading-[1.6] flex-1">{ROLE_DESC[r]}</p>
            </div>
          ))}
        </div>
      </Card>

      {inviteOpen && (
        <InviteModal busy={busy} onClose={() => setInviteOpen(false)} onInvite={invite} />
      )}
      {editing && (
        <EditRoleModal busy={busy} member={editing} onClose={() => setEditId(null)} onSave={updateRole} />
      )}
      <ConfirmModal
        open={Boolean(removeId)}
        onClose={() => setRemoveId(null)}
        onConfirm={remove}
        title={`Remove ${target?.name ?? ""}?`}
        confirmLabel="Remove staff member"
        tone="danger"
        body={<p>{target?.name ?? "This member"} will lose admin access immediately. Their audit history is retained.</p>}
      />
    </PageShell>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft px-4 py-2.5 font-normal text-left">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3">{children}</td>;
}

function InviteModal({
  onClose,
  onInvite,
  busy,
}: {
  onClose: () => void;
  onInvite: (name: string, email: string, role: RoleVal) => void;
  busy: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleVal>("support");

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute inset-0 bg-ink/30 backdrop-blur-sm" />
      <div className="relative bg-card border border-rule rounded-[14px] w-full max-w-[460px] shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)]">
        <header className="px-6 pt-6 pb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-2">Invite staff</p>
            <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink">Grant admin panel access.</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors">
            <IconClose />
          </button>
        </header>
        <div className="px-6 pb-5 flex flex-col gap-5">
          <Field label="Name" value={name} onChange={setName} placeholder="Devran Aslan" />
          <Field label="Staff email" value={email} onChange={setEmail} placeholder="name@staffbix.com" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-2">Role</p>
            <div className="flex flex-col gap-2">
              {INVITABLE_ROLES.map((r) => (
                <label
                  key={r}
                  className={`flex items-start justify-between gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${
                    role === r ? "border-ink bg-canvas-soft" : "border-rule hover:border-ink/25"
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-ink">{ROLE_LABEL[r]}</p>
                    <p className="text-[11.5px] text-ink-muted">{ROLE_DESC[r]}</p>
                  </div>
                  <input type="radio" checked={role === r} onChange={() => setRole(r)} className="sr-only" name="invite-role" />
                  <span className={`mt-1 size-3.5 rounded-full border-2 ${role === r ? "border-ink bg-ink" : "border-rule"}`} />
                </label>
              ))}
            </div>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            Sprint 19: invite emails + 2FA enrolment on first login.
          </p>
        </div>
        <footer className="px-6 py-4 border-t border-rule bg-canvas-soft/60 rounded-b-[14px] flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors">Cancel</button>
          <button
            type="button"
            disabled={busy || !name.trim() || !email.trim()}
            onClick={() => onInvite(name.trim(), email.trim(), role)}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors disabled:opacity-50"
          >
            Send invitation
          </button>
        </footer>
      </div>
    </div>
  );
}

function EditRoleModal({
  member,
  onClose,
  onSave,
  busy,
}: {
  member: ApiStaff;
  onClose: () => void;
  onSave: (id: string, role: RoleVal) => void;
  busy: boolean;
}) {
  const [role, setRole] = useState<RoleVal>(member.role);
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute inset-0 bg-ink/30 backdrop-blur-sm" />
      <div className="relative bg-card border border-rule rounded-[14px] w-full max-w-[440px] shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)]">
        <header className="px-6 pt-6 pb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-2">Edit role</p>
          <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink">{member.name}</h2>
          <p className="text-[12.5px] text-ink-muted mt-1">{member.email}</p>
        </header>
        <div className="px-6 pb-5 flex flex-col gap-2">
          {INVITABLE_ROLES.map((r) => (
            <label
              key={r}
              className={`flex items-start justify-between gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${
                role === r ? "border-ink bg-canvas-soft" : "border-rule hover:border-ink/25"
              }`}
            >
              <div className="flex-1">
                <p className="text-[13px] font-medium text-ink">{ROLE_LABEL[r]}</p>
                <p className="text-[11.5px] text-ink-muted">{ROLE_DESC[r]}</p>
              </div>
              <input type="radio" checked={role === r} onChange={() => setRole(r)} className="sr-only" name="edit-role" />
              <span className={`mt-1 size-3.5 rounded-full border-2 ${role === r ? "border-ink bg-ink" : "border-rule"}`} />
            </label>
          ))}
        </div>
        <footer className="px-6 py-4 border-t border-rule bg-canvas-soft/60 rounded-b-[14px] flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors">Cancel</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSave(member.id, role)}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors disabled:opacity-50"
          >
            Save changes
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors placeholder:text-ink-soft"
      />
    </label>
  );
}
