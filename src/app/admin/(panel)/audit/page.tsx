"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PageShell,
  Card,
  Badge,
} from "@/components/app/PageShell";
import {
  IconSearch,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from "@/components/Icons";

const PAGE_SIZES = [10, 25, 50] as const;

interface ApiAuditEvent {
  id: string;
  kind: string;
  createdAt: string;
  ip: string | null;
  userAgent: string | null;
  tenantId: string | null;
  tenantName: string | null;
  userId: string | null;
  userName: string | null;
  payload: unknown;
}

// Event kinds where the `*.fail`/`*.locked`/`*.exhausted` suffix means
// the action was blocked. Used to render the Result column.
function kindResult(kind: string): "success" | "blocked" {
  if (
    kind.endsWith(".fail") ||
    kind.endsWith(".locked") ||
    kind.endsWith(".exhausted")
  ) {
    return "blocked";
  }
  return "success";
}

const RESULTS = ["All", "success", "blocked"] as const;

export default function AdminAuditPage() {
  const [events, setEvents] = useState<ApiAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<(typeof RESULTS)[number]>("All");
  const [actor, setActor] = useState<string>("All");
  const [q, setQ] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/audit", { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as {
          events?: ApiAuditEvent[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(body.error ?? "Couldn't load audit log.");
          return;
        }
        setEvents(body.events ?? []);
      } catch {
        if (!cancelled) setLoadError("Network error loading audit log.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build a list of distinct actor names for the dropdown.
  const actors = useMemo(() => {
    const names = new Set<string>();
    for (const e of events) {
      if (e.userName) names.add(e.userName);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((a) => {
      if (result !== "All" && kindResult(a.kind) !== result) return false;
      if (actor !== "All" && a.userName !== actor) return false;
      if (q) {
        const n = q.toLowerCase();
        const hay = [
          a.kind,
          a.tenantName ?? "",
          a.userName ?? "",
          a.ip ?? "",
          JSON.stringify(a.payload ?? ""),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(n)) return false;
      }
      return true;
    });
  }, [events, result, actor, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  return (
    <PageShell
      title="Platform audit log"
      description="Every staff action across the platform. Impersonations, refunds, suspensions, deploys. Immutable. Streamed to compliance webhook."
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              // Browser-driven download — the export endpoint sets
              // Content-Disposition so this becomes a save dialog.
              window.location.href = "/api/admin/audit/export";
            }}
            className="inline-flex items-center text-[13px] font-medium px-3.5 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
          >
            Export CSV
          </button>
          {/* Audit events stream to Axiom automatically when AXIOM_TOKEN
              is set in the environment (see src/lib/audit/axiom.ts).
              There is no per-row UI toggle — it's an env-level sink, so
              this control reports status rather than offering an action. */}
          <span
            title="Audit events stream to Axiom when AXIOM_TOKEN is configured (env-level). No per-row UI toggle."
            className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3.5 py-2 rounded-full border border-rule text-ink-soft"
          >
            <span aria-hidden>↗</span>
            SIEM stream: env-configured (Axiom)
          </span>
        </>
      }
    >
      {loadError && (
        <div className="mb-5 text-[13px] text-[#B91C1C] bg-[#FEE2E2] border border-[#B91C1C]/25 rounded-md px-3 py-2">
          {loadError}
        </div>
      )}

      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {RESULTS.map((r) => {
            const active = result === r;
            const count =
              r === "All"
                ? events.length
                : events.filter((a) => kindResult(a.kind) === r).length;
            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setResult(r);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? "bg-ink text-white border-ink"
                    : "bg-card text-ink-muted border-rule hover:border-ink/30 hover:text-ink"
                }`}
              >
                {r === "All" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
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
          <div className="relative">
            <select
              value={actor}
              onChange={(e) => {
                setActor(e.target.value);
                setPage(1);
              }}
              className="appearance-none bg-card border border-rule rounded-md pl-3 pr-8 h-9 text-[12.5px] text-ink hover:border-ink/25 focus:border-ink focus:outline-none transition-colors"
            >
              <option value="All">All actors</option>
              {actors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <IconChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none"
              width={11}
              height={11}
            />
          </div>
          <div className="ml-auto inline-flex items-center gap-2 border border-rule rounded-md px-3 h-9 bg-card min-w-[280px]">
            <IconSearch className="text-ink-soft shrink-0" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Kind, tenant, actor, IP..."
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
                <Th>Time</Th>
                <Th>Actor</Th>
                <Th>Kind</Th>
                <Th>Tenant</Th>
                <Th>IP</Th>
                <Th>Result</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {visible.map((a) => {
                const r = kindResult(a.kind);
                return (
                  <tr
                    key={a.id}
                    className="hover:bg-canvas-soft/50 transition-colors"
                  >
                    <Td>
                      <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink tabular-nums">
                        {a.createdAt.replace("T", " ").slice(0, 19)}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[12.5px] text-ink">
                        {a.userName ?? "—"}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-[11.5px] text-ink">
                        {a.kind}
                      </span>
                    </Td>
                    <Td>
                      <p className="text-[12px] text-ink truncate max-w-[260px]">
                        {a.tenantName ?? "—"}
                      </p>
                    </Td>
                    <Td>
                      <span className="font-mono text-[11px] text-ink-soft">
                        {a.ip ?? "—"}
                      </span>
                    </Td>
                    <Td>
                      {r === "success" ? (
                        <Badge tone="accent">Success</Badge>
                      ) : (
                        <span className="inline-flex items-center font-mono text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded border bg-[#FEE2E2] text-[#B91C1C] border-[#B91C1C]/25">
                          Blocked
                        </span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className="text-center py-14 text-[13px] text-ink-muted">
              No events match these filters.
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3 border-t border-rule">
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
              <span>
                Showing{" "}
                <span className="text-ink tabular-nums">
                  {start + 1}–{Math.min(start + pageSize, filtered.length)}
                </span>{" "}
                of <span className="text-ink tabular-nums">{filtered.length}</span>
              </span>
              <span className="text-ink-soft/60">·</span>
              <label className="inline-flex items-center gap-2">
                <span>Per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-card border border-rule rounded px-2 py-1 text-[11px] text-ink hover:border-ink/25 focus:border-ink focus:outline-none"
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center justify-center size-7 rounded-md border border-rule text-ink-muted hover:text-ink hover:border-ink/25 disabled:opacity-40 transition-colors"
              >
                <IconChevronLeft width={13} height={13} />
              </button>
              <span className="font-mono text-[11px] text-ink-muted tabular-nums px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center justify-center size-7 rounded-md border border-rule text-ink-muted hover:text-ink hover:border-ink/25 disabled:opacity-40 transition-colors"
              >
                <IconChevronRight width={13} height={13} />
              </button>
            </div>
          </div>
        )}
      </Card>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
        Retention: 7 years · Immutable · Streamed to SIEM in real-time
      </p>
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
  return <td className="px-4 py-3 align-top">{children}</td>;
}
