"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PageShell,
  Card,
  Badge,
} from "@/components/app/PageShell";
import { Pagination } from "@/components/app/Pagination";
import { IconSearch } from "@/components/Icons";
import type { SupportTicket } from "@/lib/admin-types";

const STATUSES = ["All", "Open", "Pending", "Resolved", "Closed"] as const;
const PRIORITIES = ["All", "Critical", "High", "Normal", "Low"] as const;
const PAGE_SIZES = [10, 25, 50] as const;

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.round(diff / 3600000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

/** API row shape (api/admin/tickets returns this superset of SupportTicket). */
interface ApiTicket extends SupportTicket {
  code: string;
  tenantName: string;
}

export default function AdminSupportPage() {
  const router = useRouter();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("Open");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("All");
  const [q, setQ] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1);
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/tickets", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
          tickets?: ApiTicket[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(data.error ?? "Couldn't load tickets.");
          return;
        }
        setTickets(data.tickets ?? []);
      } catch {
        if (!cancelled) setLoadError("Network error loading tickets.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function tenantName(t: ApiTicket) {
    return t.tenantName ?? t.tenantId;
  }

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (status !== "All" && t.status !== status) return false;
      if (priority !== "All" && t.priority !== priority) return false;
      if (q) {
        const n = q.toLowerCase();
        if (
          !t.subject.toLowerCase().includes(n) &&
          !t.reporterEmail.toLowerCase().includes(n) &&
          !tenantName(t).toLowerCase().includes(n)
        )
          return false;
      }
      return true;
    }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [tickets, status, priority, q]);

  useEffect(() => {
    setPage(1);
  }, [status, priority, q, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const sliceStart = (currentPage - 1) * pageSize;
  const sliceEnd = Math.min(sliceStart + pageSize, filtered.length);
  const visible = filtered.slice(sliceStart, sliceEnd);

  return (
    <PageShell
      title="Support tickets"
      description="Inbound from in-app, email, chat, and API. Triage, assign, resolve."
      actions={
        <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          <span className="size-1.5 rounded-full bg-[#F97316]" />
          {tickets.filter(t => t.status === "Open" || t.status === "Pending").length} need attention
        </span>
      }
    >
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => {
            const active = status === s;
            const count = s === "All" ? tickets.length : tickets.filter(t => t.status === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  active ? "bg-ink text-white border-ink" : "bg-card text-ink-muted border-rule hover:border-ink/30 hover:text-ink"
                }`}
              >
                {s}
                <span className={`font-mono text-[10px] ${active ? "text-white/70" : "text-ink-soft"}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {PRIORITIES.map((p) => {
              const active = priority === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`inline-flex items-center text-[11.5px] font-medium px-2.5 py-1 rounded border transition-colors ${
                    active ? "bg-canvas-soft border-ink text-ink" : "bg-card border-rule text-ink-muted hover:border-ink/25 hover:text-ink"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <div className="ml-auto inline-flex items-center gap-2 border border-rule rounded-md px-3 h-9 bg-card min-w-[260px]">
            <IconSearch className="text-ink-soft shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Subject, reporter, tenant..."
              className="flex-1 bg-transparent text-[12.5px] text-ink placeholder:text-ink-soft border-0 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {loadError && (
        <div className="mb-3 rounded-md border border-rule bg-canvas-soft px-3 py-2 text-[12.5px] text-[#B91C1C]">
          {loadError}
        </div>
      )}

      <Card padded={false}>
        {loading && (
          <div className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            Loading…
          </div>
        )}
        <ul className="divide-y divide-rule">
          {visible.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => router.push(`/admin/support/${t.id}`)}
                className="w-full text-left px-5 py-4 hover:bg-canvas-soft/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-soft">{t.id}</code>
                    <Badge tone={t.priority === "Critical" ? "ink" : t.priority === "High" ? "ink" : "neutral"}>
                      {t.priority}
                    </Badge>
                    <Badge tone={t.status === "Open" || t.status === "Pending" ? "soft" : "neutral"}>
                      {t.status}
                    </Badge>
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">{t.channel}</span>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft tabular-nums shrink-0">
                    {ago(t.updatedAt)} ago
                  </span>
                </div>
                <p className="text-[14px] font-medium text-ink leading-tight mb-1">{t.subject}</p>
                <p className="text-[12.5px] text-ink-muted leading-[1.55] line-clamp-1 max-w-[820px]">{t.body}</p>
                <div className="mt-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                  <span>{t.reporterName}</span>
                  <span className="text-ink-soft/60">·</span>
                  <Link
                    href={`/admin/tenants/${t.tenantId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-ink transition-colors"
                  >
                    {tenantName(t)}
                  </Link>
                  {t.assignedTo && (
                    <>
                      <span className="text-ink-soft/60">·</span>
                      <span>Assigned: {t.assignedTo}</span>
                    </>
                  )}
                </div>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-5 py-14 text-center text-[13px] text-ink-muted">No tickets match these filters.</li>
          )}
        </ul>

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
    </PageShell>
  );
}
