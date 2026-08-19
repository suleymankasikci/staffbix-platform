"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageShell, Card } from "@/components/app/PageShell";
import { StatusDot } from "@/components/app/StatusDot";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import {
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconMore,
  IconArrowRight,
} from "@/components/Icons";
import { type HiredWorker } from "@/lib/hired-workers";
import { useLocale, useLocalizedPath } from "@/lib/i18n/client";
import { getAppWorkforceListCopy } from "@/lib/i18n/page-copy";

type WorkforceListCopy = ReturnType<typeof getAppWorkforceListCopy>;
const STATUSES = ["all", "online", "idle", "paused"] as const;
type StatusFilter = (typeof STATUSES)[number];

export default function WorkforceListPage() {
  const locale = useLocale();
  const href = useLocalizedPath();
  const copy = getAppWorkforceListCopy(locale);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [terminateId, setTerminateId] = useState<string | null>(null);
  const [workers, setWorkers] = useState<HiredWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/workers?shape=ui", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setLoadError(`Failed to load workforce (HTTP ${res.status}).`);
          return;
        }
        const data = (await res.json()) as { workers: HiredWorker[] };
        if (!cancelled) setWorkers(data.workers ?? []);
      } catch {
        if (!cancelled) setLoadError("Network error loading workforce.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleTerminate(id: string) {
    setTerminateId(null);
    const res = await fetch(`/api/workers/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "terminated" }),
    });
    if (res.ok) {
      setWorkers((prev) => prev.filter((w) => w.id !== id));
    }
  }

  const target = terminateId
    ? workers.find((w) => w.id === terminateId)
    : null;

  const filtered = useMemo(() => {
    return workers.filter((w) => {
      if (filter !== "all") {
        if (w.status !== filter) return false;
      }
      if (q) {
        const needle = q.toLowerCase();
        if (
          !w.name.toLowerCase().includes(needle) &&
          !w.role.toLowerCase().includes(needle)
        )
          return false;
      }
      return true;
    });
  }, [q, filter, workers]);

  return (
    <PageShell
      title={copy.title}
      description={copy.description}
      actions={
        <Link
          href={href("/app/workforce/hire")}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
        >
          <IconPlus width={13} height={13} />
          {copy.hireWorker}
        </Link>
      }
    >
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => {
            const active = s === filter;
            const count =
              s === "all"
                ? workers.length
                : workers.filter((w) => {
                    return w.status === s;
                  }).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={`inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? "bg-ink text-white border-ink"
                    : "bg-card text-ink-muted border-rule hover:border-ink/30 hover:text-ink"
                }`}
              >
                {copy.filters[s]}
                <span
                  className={`font-mono text-[10px] ${
                    active ? "text-white/70" : "text-ink-soft"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="inline-flex items-center gap-2 border border-rule rounded-md px-3 h-9 bg-card min-w-[260px] max-w-[320px]">
          <IconSearch className="text-ink-soft shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={copy.searchPlaceholder}
            className="flex-1 bg-transparent text-[12.5px] text-ink placeholder:text-ink-soft border-0 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-canvas-soft/60 border-b border-rule text-left">
                <Th>{copy.table.worker}</Th>
                <Th>{copy.table.roleCategory}</Th>
                <Th>{copy.table.status}</Th>
                <Th>{copy.table.channels}</Th>
                <Th align="right">{copy.table.messages7d}</Th>
                <Th align="right">{copy.table.pending}</Th>
                <Th>{copy.table.approvalMode}</Th>
                <Th>{""}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {filtered.map((w) => (
                <tr
                  key={w.id}
                  className="hover:bg-canvas-soft/50 transition-colors"
                >
                  <Td>
                    <Link
                      href={href(`/app/workforce/${w.id}`)}
                      className="flex items-center gap-3 group"
                    >
                      <span className="size-7 rounded-full bg-tint/60 border border-rule flex items-center justify-center font-mono text-[9px] font-medium text-ink shrink-0">
                        {w.initials}
                      </span>
                      <span className="text-[13px] font-medium text-ink group-hover:text-ink-muted transition-colors">
                        {w.name}
                      </span>
                    </Link>
                  </Td>
                  <Td>
                    <p className="text-[13px] text-ink leading-tight">
                      {w.role}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft mt-0.5">
                      {w.category}
                    </p>
                  </Td>
                  <Td>
                    <StatusDot status={w.status} />
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {w.channels.slice(0, 3).map((c) => (
                        <span
                          key={c}
                          className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted bg-canvas-soft border border-rule rounded px-1.5 py-0.5"
                        >
                          {c}
                        </span>
                      ))}
                      {w.channels.length > 3 && (
                        <span className="font-mono text-[10px] text-ink-soft">
                          +{w.channels.length - 3}
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td align="right">
                    <span className="font-mono text-[12px] tabular-nums text-ink">
                      {w.messages7d.toLocaleString(copy.numberLocale)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="font-mono text-[12px] tabular-nums text-ink">
                      {w.approvals7d}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-[12px] text-ink-muted">
                      {w.approvalMode}
                    </span>
                  </Td>
                  <Td>
                    <RowActions
                      workerId={w.id}
                      copy={copy}
                      onTerminate={() => setTerminateId(w.id)}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[13px] text-ink-muted">
              {copy.table.empty}
            </div>
          )}
        </div>
      </Card>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
        {loading
          ? "…"
          : loadError ??
            `${filtered.length} ${copy.summary.of} ${workers.length} ${copy.summary.workersShown} · ${copy.summary.tierLimit}`}
      </p>

      <ConfirmModal
        open={Boolean(target)}
        onClose={() => setTerminateId(null)}
        onConfirm={() => {
          if (terminateId) void handleTerminate(terminateId);
        }}
        title={`${copy.terminate.titlePrefix} ${target?.name ?? copy.terminate.fallback}${copy.terminate.titleSuffix}`}
        confirmLabel={copy.terminate.confirm}
        tone="danger"
        body={
          <>
            <p>
              {target?.name} ({target?.role}) {copy.terminate.bodySuffix}
            </p>
            <p className="mt-3 text-ink-soft font-mono text-[11px] uppercase tracking-[0.1em]">
              {copy.terminate.notice}
            </p>
          </>
        }
      />
    </PageShell>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft px-4 py-2.5 font-normal ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}
    >
      {children}
    </td>
  );
}

function RowActions({
  workerId,
  copy,
  onTerminate,
}: {
  workerId: string;
  copy: WorkforceListCopy;
  onTerminate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const href = useLocalizedPath();
  return (
    <div className="flex items-center justify-end gap-1 relative">
      <Link
        href={href(`/app/workforce/${workerId}/edit`)}
        className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors"
        aria-label={copy.actions.editWorker}
      >
        <IconEdit width={14} height={14} />
      </Link>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors"
        aria-label={copy.actions.more}
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
          <div className="absolute top-full right-0 mt-1 w-[180px] bg-card border border-rule rounded-md shadow-[0_8px_24px_-8px_rgba(0,0,0,0.16)] z-40 py-1">
            <Link
              href={href(`/app/workforce/${workerId}`)}
              className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
              onClick={() => setOpen(false)}
            >
              <IconArrowRight width={13} height={13} />
              {copy.actions.viewDetails}
            </Link>
            <Link
              href={href(`/app/workforce/${workerId}/edit`)}
              className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
              onClick={() => setOpen(false)}
            >
              <IconEdit width={13} height={13} />
              {copy.actions.editConfig}
            </Link>
            <div className="my-1 border-t border-rule" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onTerminate();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-[#B91C1C] hover:bg-canvas-soft transition-colors text-left"
            >
              <IconTrash width={13} height={13} />
              {copy.actions.terminate}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
