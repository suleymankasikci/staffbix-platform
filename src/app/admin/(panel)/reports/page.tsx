"use client";

import { useEffect, useState } from "react";
import {
  PageShell,
  Card,
  SectionTitle,
  Badge,
} from "@/components/app/PageShell";
import { IconClose } from "@/components/Icons";

/**
 * Sprint 16 — platform reports.
 *
 * The MRR/Churn/Tickets mock arrays are gone. This page now lists every
 * report row from `/api/admin/reports` (tenant-scoped and platform-
 * scoped alike) and exposes one-click runners for the two admin-only
 * kinds: billing_summary and tenants_overview. Auto-creates a report
 * row the first time each quick-run button is pressed so subsequent
 * runs append to the same history.
 */

type AdminReportKind =
  | "workforce_volume"
  | "ai_spend_daily"
  | "approvals_throughput"
  | "billing_summary"
  | "tenants_overview";

interface ApiAdminReport {
  id: string;
  tenantId: string | null;
  name: string;
  kind: AdminReportKind;
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

const KIND_LABEL: Record<AdminReportKind, string> = {
  workforce_volume: "Workforce volume",
  ai_spend_daily: "AI spend",
  approvals_throughput: "Approvals throughput",
  billing_summary: "Billing summary",
  tenants_overview: "Tenants overview",
};

const QUICK_REPORTS: Array<{
  kind: "billing_summary" | "tenants_overview";
  label: string;
  defaultName: string;
  description: string;
}> = [
  {
    kind: "billing_summary",
    label: "Run billing summary",
    defaultName: "Billing summary (last 12 months)",
    description: "MRR, new signups, churn — last 12 months.",
  },
  {
    kind: "tenants_overview",
    label: "Run tenants overview",
    defaultName: "Tenants overview",
    description: "Tenant counts by plan and status, right now.",
  },
];

export default function AdminReportsPage() {
  const [items, setItems] = useState<ApiAdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyKind, setBusyKind] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<{
    reportId: string;
    kind: AdminReportKind;
    name: string;
    data: unknown;
    rowCount: number | null;
    durationMs: number | null;
  } | null>(null);

  async function reload() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/reports", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        reports?: ApiAdminReport[];
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

  async function ensureReport(kind: "billing_summary" | "tenants_overview") {
    // Find an existing platform-scoped report of this kind, or create one.
    const existing = items.find((i) => i.kind === kind && i.tenantId === null);
    if (existing) return existing.id;

    const quick = QUICK_REPORTS.find((q) => q.kind === kind);
    const res = await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: quick?.defaultName ?? KIND_LABEL[kind],
        kind,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      error?: string;
    };
    if (!res.ok || !data.id) {
      throw new Error(data.error ?? "Could not create report");
    }
    await reload();
    return data.id;
  }

  async function runQuick(kind: "billing_summary" | "tenants_overview") {
    setActionError(null);
    setBusyKind(kind);
    try {
      const id = await ensureReport(kind);
      const res = await fetch(`/api/admin/reports/${id}/run`, {
        method: "POST",
      });
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
      const quick = QUICK_REPORTS.find((q) => q.kind === kind);
      setRunResult({
        reportId: id,
        kind,
        name: quick?.defaultName ?? KIND_LABEL[kind],
        data: data.run.data ?? null,
        rowCount: data.run.rowCount ?? null,
        durationMs: data.run.durationMs ?? null,
      });
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Run failed.";
      setActionError(message);
    } finally {
      setBusyKind(null);
    }
  }

  async function runExisting(reportId: string, kind: AdminReportKind) {
    setActionError(null);
    setBusyKind(reportId);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/run`, {
        method: "POST",
      });
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
      const r = items.find((x) => x.id === reportId);
      setRunResult({
        reportId,
        kind,
        name: r?.name ?? KIND_LABEL[kind],
        data: data.run.data ?? null,
        rowCount: data.run.rowCount ?? null,
        durationMs: data.run.durationMs ?? null,
      });
      await reload();
    } catch {
      setActionError("Network error running report.");
    } finally {
      setBusyKind(null);
    }
  }

  return (
    <PageShell
      title="Platform reports"
      description="Internal-facing analytics. Tenant-owned reports live inside each tenant's workspace."
    >
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

      {/* Quick-run cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {QUICK_REPORTS.map((q) => (
          <Card key={q.kind}>
            <SectionTitle label={KIND_LABEL[q.kind]} description={q.description} />
            <button
              type="button"
              onClick={() => void runQuick(q.kind)}
              disabled={busyKind === q.kind}
              className="mt-3 inline-flex items-center px-3.5 py-2 text-[12.5px] font-medium rounded-full bg-ink text-white hover:bg-ink/85 transition-colors disabled:opacity-50"
            >
              {busyKind === q.kind ? "Running…" : q.label}
            </button>
          </Card>
        ))}
      </div>

      {runResult && (
        <Card className="mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[13px] font-medium text-ink">{runResult.name}</p>
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
          <ResultPreview kind={runResult.kind} data={runResult.data} />
          <details className="mt-3">
            <summary className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft cursor-pointer hover:text-ink">
              Raw JSON
            </summary>
            <pre className="mt-2 text-[11.5px] font-mono bg-canvas-soft border border-rule rounded-md p-3 overflow-auto max-h-[400px] whitespace-pre-wrap break-all">
              {JSON.stringify(runResult.data, null, 2)}
            </pre>
          </details>
        </Card>
      )}

      <Card padded={false}>
        <div className="px-5 pt-5 pb-3">
          <SectionTitle
            label="Saved reports"
            description="Every report across tenants and the platform itself. Click Run now to re-execute."
          />
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-14 text-[13px] text-ink-muted">
              Loading reports…
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-14 text-[13px] text-ink-muted">
              No reports yet.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-canvas-soft/60 border-b border-rule text-left">
                  <Th>Name</Th>
                  <Th>Kind</Th>
                  <Th>Scope</Th>
                  <Th>Schedule</Th>
                  <Th>Last run</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {items.map((r) => (
                  <tr key={r.id}>
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
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                        {r.tenantId ? `tenant ${r.tenantId.slice(0, 8)}…` : "platform"}
                      </span>
                    </Td>
                    <Td>
                      {r.schedule ? (
                        <span className="font-mono text-[11px] text-ink-muted">
                          {r.schedule}
                        </span>
                      ) : (
                        <span className="text-[11.5px] text-ink-soft">Manual</span>
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
                        </div>
                      ) : (
                        <span className="text-[11.5px] text-ink-soft">Never</span>
                      )}
                    </Td>
                    <Td align="right">
                      <button
                        type="button"
                        onClick={() => void runExisting(r.id, r.kind)}
                        disabled={busyKind === r.id}
                        className="inline-flex items-center px-3 py-1.5 text-[12px] font-medium rounded-full border border-rule text-ink hover:bg-canvas-soft transition-colors disabled:opacity-50"
                      >
                        {busyKind === r.id ? "Running…" : "Run now"}
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </PageShell>
  );
}

function ResultPreview({
  kind,
  data,
}: {
  kind: AdminReportKind;
  data: unknown;
}) {
  if (!data || typeof data !== "object") {
    return (
      <p className="text-[12.5px] text-ink-muted">No data returned.</p>
    );
  }
  const d = data as Record<string, unknown>;

  if (kind === "billing_summary" && Array.isArray(d.months)) {
    const months = d.months as Array<{
      month: string;
      mrrCents: number;
      newSignups: number;
      churn: number;
    }>;
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-canvas-soft/60 border-b border-rule text-left">
              <Th>Month</Th>
              <Th align="right">MRR</Th>
              <Th align="right">New signups</Th>
              <Th align="right">Churn</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {months.map((m) => (
              <tr key={m.month}>
                <Td>
                  <span className="font-mono text-[12px] text-ink">{m.month}</span>
                </Td>
                <Td align="right">
                  <span className="font-mono text-[12px] tabular-nums text-ink">
                    ${(m.mrrCents / 100).toLocaleString()}
                  </span>
                </Td>
                <Td align="right">
                  <span className="font-mono text-[12px] tabular-nums text-ink">
                    {m.newSignups}
                  </span>
                </Td>
                <Td align="right">
                  <span className="font-mono text-[12px] tabular-nums text-ink">
                    {m.churn}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (kind === "tenants_overview") {
    const byPlan = Array.isArray(d.byPlan)
      ? (d.byPlan as Array<{ planId: string; count: number }>)
      : [];
    const byStatus = Array.isArray(d.byStatus)
      ? (d.byStatus as Array<{ status: string; count: number }>)
      : [];
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-2">
            By plan
          </p>
          <ul className="flex flex-col gap-1">
            {byPlan.map((p) => (
              <li
                key={p.planId}
                className="flex items-center justify-between px-3 py-2 border border-rule rounded-md"
              >
                <span className="text-[12.5px] text-ink">{p.planId}</span>
                <span className="font-mono text-[12px] tabular-nums text-ink">
                  {p.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-2">
            By status
          </p>
          <ul className="flex flex-col gap-1">
            {byStatus.map((s) => (
              <li
                key={s.status}
                className="flex items-center justify-between px-3 py-2 border border-rule rounded-md"
              >
                <span className="text-[12.5px] text-ink">{s.status}</span>
                <span className="font-mono text-[12px] tabular-nums text-ink">
                  {s.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <p className="text-[12.5px] text-ink-muted">
      Result returned. Expand &ldquo;Raw JSON&rdquo; below to inspect.
    </p>
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
