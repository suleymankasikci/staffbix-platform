"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell, Card, Badge } from "@/components/app/PageShell";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import {
  IconPlus,
  IconClose,
  IconTrash,
} from "@/components/Icons";

/**
 * Sprint 16 — live reports list. The mock REPORTS array has been
 * removed; this page now reads from `/api/reports` and exposes Run
 * Now + Delete actions. Chart rendering of run results is intentionally
 * minimal (a <pre>JSON</pre> block) — the polished chart UI lands with
 * the scheduler in Sprint 19.
 */

type TenantReportKind =
  | "workforce_volume"
  | "ai_spend_daily"
  | "approvals_throughput";

interface ApiReport {
  id: string;
  name: string;
  kind: TenantReportKind;
  config: Record<string, unknown>;
  schedule: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  lastRun: {
    id: string;
    status: "queued" | "running" | "completed" | "failed";
    startedAt: string;
    finishedAt: string | null;
    durationMs: number | null;
    rowCount: number | null;
    error: string | null;
  } | null;
}

const TENANT_KINDS: Array<{ value: TenantReportKind; label: string; hint: string }> = [
  {
    value: "workforce_volume",
    label: "Workforce volume",
    hint: "Messages per worker per day, last 30 days.",
  },
  {
    value: "ai_spend_daily",
    label: "AI spend (daily)",
    hint: "AI usage cost per day, last 30 days.",
  },
  {
    value: "approvals_throughput",
    label: "Approvals throughput",
    hint: "Pending vs approved/sent/rejected per day, last 30 days.",
  },
];

const KIND_LABEL: Record<TenantReportKind, string> = {
  workforce_volume: "Workforce volume",
  ai_spend_daily: "AI spend",
  approvals_throughput: "Approvals throughput",
};

export default function ReportsListPage() {
  const [items, setItems] = useState<ApiReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<{
    reportId: string;
    name: string;
    data: unknown;
    rowCount: number | null;
    durationMs: number | null;
  } | null>(null);

  const target = deleteId ? items.find((i) => i.id === deleteId) ?? null : null;

  async function reload() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/reports", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        reports?: ApiReport[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(data.error ?? "Couldn't load reports.");
        return;
      }
      setItems(data.reports ?? []);
    } catch {
      setLoadError("Network error loading reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleCreate(input: {
    name: string;
    kind: TenantReportKind;
    schedule: string | null;
  }) {
    setActionError(null);
    setBusyId("__create__");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "Could not create report.");
        return false;
      }
      await reload();
      return true;
    } catch {
      setActionError("Network error creating report.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function handleRun(id: string) {
    setActionError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/reports/${id}/run`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        run?: {
          status: string;
          rowCount?: number;
          durationMs?: number;
          data?: unknown;
        };
        error?: string;
      };
      if (!res.ok || !data.run) {
        setActionError(data.error ?? "Run failed.");
        return;
      }
      const r = items.find((x) => x.id === id);
      setRunResult({
        reportId: id,
        name: r?.name ?? "Report",
        data: data.run.data ?? null,
        rowCount: data.run.rowCount ?? null,
        durationMs: data.run.durationMs ?? null,
      });
      await reload();
    } catch {
      setActionError("Network error running report.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setActionError(null);
    setBusyId(deleteId);
    try {
      const res = await fetch(`/api/reports/${deleteId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "Could not delete report.");
        return;
      }
      setDeleteId(null);
      await reload();
    } catch {
      setActionError("Network error deleting report.");
    } finally {
      setBusyId(null);
    }
  }

  const stats = useMemo(() => {
    const completed = items.filter((i) => i.lastRun?.status === "completed").length;
    const failed = items.filter((i) => i.lastRun?.status === "failed").length;
    return { total: items.length, completed, failed };
  }, [items]);

  return (
    <PageShell
      title="Reports"
      description="Run analytics queries over your workforce, AI spend and approvals."
      actions={
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
        >
          <IconPlus width={13} height={13} />
          New report
        </button>
      }
    >
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-rule rounded-[12px] border border-rule overflow-hidden mb-6">
        <Stat label="Reports" value={String(stats.total)} />
        <Stat label="Last run completed" value={String(stats.completed)} />
        <Stat label="Last run failed" value={String(stats.failed)} />
      </div>

      {loadError && (
        <Card className="mb-5 border-[#B91C1C]/30 bg-[#FEF2F2]">
          <p className="text-[12.5px] text-[#B91C1C]">{loadError}</p>
        </Card>
      )}
      {actionError && (
        <Card className="mb-5 border-[#B91C1C]/30 bg-[#FEF2F2]">
          <p className="text-[12.5px] text-[#B91C1C]">{actionError}</p>
        </Card>
      )}

      <Card padded={false}>
        {loading ? (
          <div className="text-center py-14 text-[13px] text-ink-muted">
            Loading reports…
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-14 text-[13px] text-ink-muted">
            No reports yet. Click <strong>New report</strong> to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-canvas-soft/60 border-b border-rule text-left">
                  <Th>Name</Th>
                  <Th>Kind</Th>
                  <Th>Schedule</Th>
                  <Th>Last run</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-canvas-soft/50 transition-colors">
                    <Td>
                      <p className="text-[13px] font-medium text-ink">{r.name}</p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft mt-1">
                        {r.createdAt.slice(0, 10)}
                      </p>
                    </Td>
                    <Td>
                      <Badge tone="neutral">{KIND_LABEL[r.kind] ?? r.kind}</Badge>
                    </Td>
                    <Td>
                      {r.schedule ? (
                        <span className="font-mono text-[11px] text-ink-muted">
                          {r.schedule}
                        </span>
                      ) : (
                        <span className="text-[11.5px] text-ink-soft">Manual only</span>
                      )}
                    </Td>
                    <Td>
                      {r.lastRun ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge
                            tone={
                              r.lastRun.status === "completed"
                                ? "accent"
                                : r.lastRun.status === "failed"
                                ? "soft"
                                : "neutral"
                            }
                          >
                            {r.lastRun.status}
                          </Badge>
                          {r.lastRun.rowCount !== null && (
                            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                              {r.lastRun.rowCount} rows
                              {r.lastRun.durationMs !== null
                                ? ` · ${r.lastRun.durationMs}ms`
                                : ""}
                            </span>
                          )}
                          {r.lastRun.error && (
                            <span className="text-[11px] text-[#B91C1C] max-w-[280px] truncate">
                              {r.lastRun.error}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11.5px] text-ink-soft">Never run</span>
                      )}
                    </Td>
                    <Td align="right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleRun(r.id)}
                          disabled={busyId === r.id}
                          className="inline-flex items-center px-3 py-1.5 text-[12px] font-medium rounded-full bg-ink text-white hover:bg-ink/85 transition-colors disabled:opacity-50"
                        >
                          {busyId === r.id ? "Running…" : "Run now"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(r.id)}
                          className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-[#B91C1C] hover:bg-canvas-soft transition-colors"
                          aria-label="Delete report"
                        >
                          <IconTrash width={13} height={13} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {runResult && (
        <Card className="mt-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[13px] font-medium text-ink">
                Run result: {runResult.name}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft mt-1">
                {runResult.rowCount ?? 0} rows
                {runResult.durationMs !== null
                  ? ` · ${runResult.durationMs}ms`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRunResult(null)}
              className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors"
              aria-label="Dismiss result"
            >
              <IconClose width={13} height={13} />
            </button>
          </div>
          <pre className="text-[11.5px] font-mono bg-canvas-soft border border-rule rounded-md p-3 overflow-auto max-h-[400px] whitespace-pre-wrap break-all">
            {JSON.stringify(runResult.data, null, 2)}
          </pre>
        </Card>
      )}

      {composeOpen && (
        <ComposeModal
          busy={busyId === "__create__"}
          onClose={() => setComposeOpen(false)}
          onSubmit={async (input) => {
            const ok = await handleCreate(input);
            if (ok) setComposeOpen(false);
          }}
        />
      )}

      <ConfirmModal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
        title={`Delete "${target?.name ?? "report"}"?`}
        confirmLabel="Delete"
        tone="danger"
        body={
          <p>
            This permanently removes the report and all of its run history.
          </p>
        }
      />
    </PageShell>
  );
}

function ComposeModal({
  busy,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    kind: TenantReportKind;
    schedule: string | null;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<TenantReportKind>("workforce_volume");
  const [schedule, setSchedule] = useState("");

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4">
      <div className="bg-card border border-rule rounded-[12px] shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rule">
          <p className="text-[14px] font-medium text-ink">New report</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors"
            aria-label="Close"
          >
            <IconClose width={13} height={13} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monday morning volume"
              className="border border-rule rounded-md px-3 h-9 bg-card text-[12.5px] text-ink placeholder:text-ink-soft focus:outline-none focus:border-ink/30"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
              Kind
            </span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as TenantReportKind)}
              className="border border-rule rounded-md px-3 h-9 bg-card text-[12.5px] text-ink focus:outline-none focus:border-ink/30"
            >
              {TENANT_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-ink-soft">
              {TENANT_KINDS.find((k) => k.value === kind)?.hint}
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
              Schedule (cron, optional)
            </span>
            <input
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="e.g. 0 9 * * 1"
              className="border border-rule rounded-md px-3 h-9 bg-card text-[12.5px] text-ink placeholder:text-ink-soft font-mono focus:outline-none focus:border-ink/30"
            />
            <span className="text-[11px] text-ink-soft">
              Stored now, executed by the background scheduler in Sprint 19.
              Leave blank for manual-only runs.
            </span>
          </label>
        </div>
        <div className="px-5 py-4 border-t border-rule flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-[12.5px] font-medium rounded-full text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !name.trim()}
            onClick={() =>
              void onSubmit({
                name: name.trim(),
                kind,
                schedule: schedule.trim() || null,
              })
            }
            className="px-3.5 py-2 text-[12.5px] font-medium rounded-full bg-ink text-white hover:bg-ink/85 transition-colors disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-2">
        {label}
      </p>
      <p className="text-[24px] font-medium tracking-[-0.02em] text-ink leading-none tabular-nums">
        {value}
      </p>
    </div>
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
    <td className={`px-4 py-3.5 ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </td>
  );
}
