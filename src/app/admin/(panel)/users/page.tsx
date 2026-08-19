"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PageShell,
  Card,
  Badge,
} from "@/components/app/PageShell";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import { Pagination } from "@/components/app/Pagination";
import { IconSearch, IconMore } from "@/components/Icons";

const STATUSES = ["All", "Active", "Invited", "Banned", "Locked"] as const;
const ROLES = ["All", "Owner", "Admin", "Editor", "Reviewer"] as const;
const PAGE_SIZES = [10, 25, 50] as const;

interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Editor" | "Reviewer";
  status: "Active" | "Invited" | "Banned" | "Locked";
  locale: string;
  tenantId: string;
  tenantName: string;
  createdAt: string;
  lastSeenAt: string | null;
}

export default function AdminUsersPage() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("All");
  const [role, setRole] = useState<(typeof ROLES)[number]>("All");
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [banId, setBanId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/users", { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as {
          users?: ApiUser[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(body.error ?? "Couldn't load users.");
          return;
        }
        setUsers(body.users ?? []);
      } catch {
        if (!cancelled) setLoadError("Network error loading users.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const target = banId ? users.find((u) => u.id === banId) : null;

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (status !== "All" && u.status !== status) return false;
      if (role !== "All" && u.role !== role) return false;
      if (q) {
        const n = q.toLowerCase();
        if (
          !u.name.toLowerCase().includes(n) &&
          !u.email.toLowerCase().includes(n) &&
          !u.tenantName.toLowerCase().includes(n)
        )
          return false;
      }
      return true;
    });
  }, [users, status, role, q]);

  useEffect(() => {
    setPage(1);
  }, [status, role, q, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const sliceStart = (currentPage - 1) * pageSize;
  const sliceEnd = Math.min(sliceStart + pageSize, filtered.length);
  const visible = filtered.slice(sliceStart, sliceEnd);

  async function doBan() {
    if (!banId) return;
    setActionError(null);
    setBusy(banId);
    try {
      const res = await fetch(`/api/admin/users/${banId}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setActionError(body.error ?? "Couldn't ban user.");
        return;
      }
      setUsers((us) =>
        us.map((u) => (u.id === banId ? { ...u, status: "Banned" } : u)),
      );
      setBanId(null);
    } catch {
      setActionError("Network error banning user.");
    } finally {
      setBusy(null);
    }
  }

  async function unban(id: string) {
    setActionError(null);
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/unban`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setActionError(body.error ?? "Couldn't unban user.");
        return;
      }
      setUsers((us) =>
        us.map((u) => (u.id === id ? { ...u, status: "Active" } : u)),
      );
    } catch {
      setActionError("Network error unbanning user.");
    } finally {
      setBusy(null);
    }
  }

  async function passwordReset(id: string, email: string) {
    setActionError(null);
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/password-reset`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setActionError(body.error ?? "Couldn't send password reset.");
      } else {
        setActionError(`Password reset queued for ${email}.`);
      }
    } catch {
      setActionError("Network error sending password reset.");
    } finally {
      setBusy(null);
    }
  }

  function exportCsv() {
    // Anchor download to a same-origin URL so the browser handles the
    // Content-Disposition header attachment for us.
    window.location.href = "/api/admin/users/export";
  }

  return (
    <PageShell
      title="Users"
      description="Every login-active account across every tenant. Search by name or email, drill into the tenant for context."
      actions={
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
        >
          Export CSV
        </button>
      }
    >
      {loadError && (
        <div className="mb-5 text-[13px] text-[#B91C1C] bg-[#FEE2E2] border border-[#B91C1C]/25 rounded-md px-3 py-2">
          {loadError}
        </div>
      )}
      {actionError && (
        <div className="mb-5 text-[13px] text-ink bg-canvas-soft border border-rule rounded-md px-3 py-2">
          {actionError}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => {
            const active = status === s;
            const count =
              s === "All"
                ? users.length
                : users.filter((u) => u.status === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? "bg-ink text-white border-ink"
                    : "bg-card text-ink-muted border-rule hover:border-ink/30 hover:text-ink"
                }`}
              >
                {s}
                <span
                  className={`font-mono text-[10px] ${active ? "text-white/70" : "text-ink-soft"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {ROLES.map((r) => {
              const active = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`inline-flex items-center text-[11.5px] font-medium px-2.5 py-1 rounded border transition-colors ${
                    active
                      ? "bg-canvas-soft border-ink text-ink"
                      : "bg-card border-rule text-ink-muted hover:border-ink/25 hover:text-ink"
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
          <div className="ml-auto inline-flex items-center gap-2 border border-rule rounded-md px-3 h-9 bg-card min-w-[260px]">
            <IconSearch className="text-ink-soft shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, email, or tenant..."
              className="flex-1 bg-transparent text-[12.5px] text-ink placeholder:text-ink-soft border-0 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-canvas-soft/60 border-b border-rule text-left">
                <Th>User</Th>
                <Th>Tenant</Th>
                <Th>Role</Th>
                <Th>Locale</Th>
                <Th>Last seen</Th>
                <Th>Signed up</Th>
                <Th>Status</Th>
                <Th>{""}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {visible.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-canvas-soft/50 transition-colors"
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="size-8 rounded-full bg-tint/60 border border-rule flex items-center justify-center font-mono text-[10px] font-medium text-ink shrink-0">
                        {u.name
                          .split(" ")
                          .map((s) => s[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-ink truncate">
                          {u.name}
                        </p>
                        <p className="text-[11.5px] text-ink-muted truncate">
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Link
                      href={`/admin/tenants/${u.tenantId}`}
                      className="text-[12.5px] text-ink hover:text-ink-muted transition-colors"
                    >
                      {u.tenantName}
                    </Link>
                  </Td>
                  <Td>
                    <Badge tone={u.role === "Owner" ? "ink" : "neutral"}>
                      {u.role}
                    </Badge>
                  </Td>
                  <Td>
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                      {u.locale}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft tabular-nums">
                      {u.lastSeenAt
                        ? u.lastSeenAt.replace("T", " ").slice(0, 16)
                        : "—"}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                      {u.createdAt.slice(0, 10)}
                    </span>
                  </Td>
                  <Td>
                    {u.status === "Active" && <Badge tone="accent">Active</Badge>}
                    {u.status === "Invited" && <Badge tone="soft">Invited</Badge>}
                    {u.status === "Locked" && (
                      <Badge tone="neutral">Locked</Badge>
                    )}
                    {u.status === "Banned" && (
                      <span className="inline-flex items-center font-mono text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded border bg-[#FEE2E2] text-[#B91C1C] border-[#B91C1C]/25">
                        Banned
                      </span>
                    )}
                  </Td>
                  <Td>
                    <UserActions
                      user={u}
                      busy={busy === u.id}
                      onBan={() => setBanId(u.id)}
                      onUnban={() => unban(u.id)}
                      onPasswordReset={() => passwordReset(u.id, u.email)}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className="text-center py-14 text-[13px] text-ink-muted">
              No users match these filters.
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizes={PAGE_SIZES}
            total={filtered.length}
            sliceStart={sliceStart}
            sliceEnd={sliceEnd}
            onPageChange={setPage}
            onPageSizeChange={(s) => setPageSize(s)}
          />
        )}
      </Card>

      <ConfirmModal
        open={Boolean(banId)}
        onClose={() => setBanId(null)}
        onConfirm={doBan}
        title={`Ban ${target?.name}?`}
        confirmLabel="Ban user"
        tone="danger"
        body={
          <p>
            User cannot sign in anywhere on the platform. Tenant owner is
            notified. Audit log records this action with your staff ID.
          </p>
        }
      />
    </PageShell>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft px-4 py-2.5 font-normal text-left">
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3">{children}</td>;
}

function UserActions({
  user,
  busy,
  onBan,
  onUnban,
  onPasswordReset,
}: {
  user: ApiUser;
  busy: boolean;
  onBan: () => void;
  onUnban: () => void;
  onPasswordReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-end gap-1 relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors disabled:opacity-40"
        aria-label="More"
        disabled={busy}
      >
        <IconMore width={14} height={14} />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full right-0 mt-1 w-[200px] bg-card border border-rule rounded-md shadow-[0_8px_24px_-8px_rgba(0,0,0,0.16)] z-40 py-1">
            <Link
              href={`/admin/tenants/${user.tenantId}`}
              className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
              onClick={() => setOpen(false)}
            >
              View tenant
            </Link>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors text-left"
              onClick={() => {
                setOpen(false);
                onPasswordReset();
              }}
            >
              Send password reset
            </button>
            {user.status === "Banned" ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onUnban();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors text-left"
              >
                Unban user
              </button>
            ) : (
              <>
                <div className="my-1 border-t border-rule" />
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onBan();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-[#B91C1C] hover:bg-canvas-soft transition-colors text-left"
                >
                  Ban user
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
