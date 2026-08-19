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
import { IconPlus, IconEdit, IconTrash, IconSearch } from "@/components/Icons";
import { CATEGORIES, type Role } from "@/lib/roles";

const PAGE_SIZES = [10, 25, 50] as const;

export default function AdminCatalogPage() {
  const [active, setActive] = useState<(typeof CATEGORIES)[number]>("All");
  const [q, setQ] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/catalog-roles", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setLoadError(`HTTP ${res.status}`);
          return;
        }
        const json = (await res.json()) as { roles: Role[] };
        if (!cancelled) setRoles(json.roles);
      } catch {
        if (!cancelled) setLoadError("Network error.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const target = archiveId ? roles.find((r) => r.slug === archiveId) : null;

  const filtered = useMemo(() => {
    return roles.filter((r) => {
      if (active !== "All" && r.category !== active) return false;
      if (q) {
        const n = q.toLowerCase();
        if (!r.title.toLowerCase().includes(n) && !r.summary.toLowerCase().includes(n) && !r.slug.toLowerCase().includes(n)) return false;
      }
      return true;
    }).sort((a, b) => a.title.localeCompare(b.title));
  }, [roles, active, q]);

  useEffect(() => {
    setPage(1);
  }, [active, q, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const sliceStart = (currentPage - 1) * pageSize;
  const sliceEnd = Math.min(sliceStart + pageSize, filtered.length);
  const visible = filtered.slice(sliceStart, sliceEnd);

  async function doArchive() {
    if (!archiveId) return;
    setArchiveBusy(true);
    setArchiveError(null);
    try {
      const res = await fetch(
        `/api/admin/catalog-roles/${encodeURIComponent(archiveId)}`,
        { method: "DELETE" },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setArchiveError(json.error ?? `Delete failed (HTTP ${res.status}).`);
        return;
      }
      setRoles((rs) => rs.filter((r) => r.slug !== archiveId));
      setArchiveId(null);
    } catch {
      setArchiveError("Network error while archiving.");
    } finally {
      setArchiveBusy(false);
    }
  }

  return (
    <PageShell
      title="Role catalog"
      description="The 64 AI roles every tenant can hire from. Edit the description, channels, or status — changes propagate to every tenant within minutes."
      actions={
        <Link
          href="/admin/catalog/new"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
        >
          <IconPlus width={13} height={13} />
          New role
        </Link>
      }
    >
      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const isActive = active === c;
            const count = c === "All" ? roles.length : roles.filter((r) => r.category === c).length;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActive(c)}
                className={`inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  isActive ? "bg-ink text-white border-ink" : "bg-card text-ink-muted border-rule hover:border-ink/30 hover:text-ink"
                }`}
              >
                {c}
                <span className={`font-mono text-[10px] ${isActive ? "text-white/70" : "text-ink-soft"}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="inline-flex items-center gap-2 border border-rule rounded-md px-3 h-9 bg-card min-w-[260px]">
          <IconSearch className="text-ink-soft shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, slug, summary..."
            className="flex-1 bg-transparent text-[12.5px] text-ink placeholder:text-ink-soft border-0 focus:outline-none"
          />
        </div>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-3">
        {filtered.length} of {roles.length} roles
      </p>

      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-canvas-soft/60 border-b border-rule text-left">
                <Th>Role</Th>
                <Th>Slug</Th>
                <Th>Category</Th>
                <Th>Channels</Th>
                <Th>Status</Th>
                <Th>{""}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {visible.map((r) => (
                <tr key={r.slug} className="hover:bg-canvas-soft/50 transition-colors">
                  <Td>
                    <p className="text-[13px] font-medium text-ink leading-tight">{r.title}</p>
                    <p className="text-[11.5px] text-ink-muted leading-[1.55] mt-0.5 max-w-[420px] truncate">{r.summary}</p>
                  </Td>
                  <Td>
                    <code className="font-mono text-[11px] text-ink-muted">{r.slug}</code>
                  </Td>
                  <Td>
                    <Badge tone="neutral">{r.category}</Badge>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {r.channels.slice(0, 3).map((c) => (
                        <span key={c} className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted bg-canvas-soft border border-rule rounded px-1.5 py-0.5">{c}</span>
                      ))}
                      {r.channels.length > 3 && <span className="font-mono text-[10px] text-ink-soft">+{r.channels.length - 3}</span>}
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={r.status === "available" ? "accent" : "soft"}>
                      {r.status === "available" ? "Available" : "Coming Q3"}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/catalog/${r.slug}/edit`}
                        className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors"
                        aria-label="Edit"
                      >
                        <IconEdit width={14} height={14} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setArchiveId(r.slug)}
                        className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-[#B91C1C] hover:bg-canvas-soft transition-colors"
                        aria-label="Archive"
                      >
                        <IconTrash width={14} height={14} />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-14 text-[13px] text-ink-muted">
              {loadError
                ? `Could not load catalog: ${loadError}`
                : roles.length === 0
                  ? "Loading roles…"
                  : "No roles match these filters."}
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
        open={Boolean(archiveId)}
        onClose={() => {
          setArchiveId(null);
          setArchiveError(null);
        }}
        onConfirm={doArchive}
        title={`Archive "${target?.title}"?`}
        confirmLabel={archiveBusy ? "Archiving…" : "Archive role"}
        tone="danger"
        body={
          <>
            <p>
              The role becomes invisible to new tenants. Existing tenants
              that have hired it keep their workers running until they
              terminate.
            </p>
            {archiveError && (
              <p className="mt-3 text-[12px] text-[#B91C1C]" role="alert">
                {archiveError}
              </p>
            )}
          </>
        }
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
