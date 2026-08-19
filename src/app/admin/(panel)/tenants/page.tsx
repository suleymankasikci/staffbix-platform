"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PageShell,
  Card,
  Badge,
} from "@/components/app/PageShell";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import { Pagination } from "@/components/app/Pagination";
import {
  IconSearch,
  IconArrowRight,
  IconMore,
  IconClose,
  IconCheck,
} from "@/components/Icons";
import type { Tenant } from "@/lib/admin-types";

/**
 * Plan row as returned by GET /api/admin/plans. Shape mirrors the
 * `plans` DB table (src/lib/db/schema/plans.ts). The admin-tenants UI
 * cares about a subset of fields — name, monthly price, soft limits.
 */
interface AdminPlanRow {
  id: string;
  name: string;
  priceMonthlyCents: number;
  maxWorkers: number; // -1 = unlimited
  maxTeamSeats: number;
  isPublic: boolean;
  sortOrder: number;
}

const STATUSES = ["All", "Active", "Trial", "Past due", "Suspended", "Churned"] as const;
const PLANS = ["All", "Starter", "Growth", "Business", "Enterprise"] as const;
const PAGE_SIZES = [10, 25, 50] as const;

type RowAction =
  | { kind: "impersonate"; tenant: Tenant }
  | { kind: "changePlan"; tenant: Tenant }
  | { kind: "issueCredit"; tenant: Tenant }
  | { kind: "suspend"; tenant: Tenant }
  | null;

export default function AdminTenantsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("All");
  const [plan, setPlan] = useState<(typeof PLANS)[number]>("All");
  const [q, setQ] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [action, setAction] = useState<RowAction>(null);
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1);

  // Fetch real tenants on mount. The admin session cookie is sent
  // automatically by the browser — if it's missing or expired we get a
  // 401, which we surface as an inline error (the panel's outer layout
  // also enforces auth and will redirect if needed in Sprint 3).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/tenants", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
          tenants?: Tenant[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(data.error ?? "Couldn't load tenants.");
          return;
        }
        setTenants(data.tenants ?? []);
      } catch {
        if (!cancelled) setLoadError("Network error while loading tenants.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      if (status !== "All" && t.status !== status) return false;
      if (plan !== "All" && t.plan !== plan) return false;
      if (q) {
        const n = q.toLowerCase();
        if (
          !t.name.toLowerCase().includes(n) &&
          !t.ownerEmail.toLowerCase().includes(n) &&
          !t.region.toLowerCase().includes(n)
        )
          return false;
      }
      return true;
    });
  }, [tenants, status, plan, q]);

  // Reset page when filters change.
  useEffect(() => {
    setPage(1);
  }, [status, plan, q, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const sliceStart = (currentPage - 1) * pageSize;
  const sliceEnd = Math.min(sliceStart + pageSize, filtered.length);
  const visible = filtered.slice(sliceStart, sliceEnd);

  const totalMRR = tenants.reduce((sum, t) => sum + t.mrr, 0);
  const totalWorkers = tenants.reduce((sum, t) => sum + t.workersHired, 0);
  const totalUsers = tenants.reduce((sum, t) => sum + t.users, 0);

  function doSuspend(t: Tenant) {
    setTenants((ts) =>
      ts.map((x) => (x.id === t.id ? { ...x, status: "Suspended", mrr: 0 } : x))
    );
  }

  function doChangePlan(t: Tenant, newPlan: Tenant["plan"], newMRR: number) {
    setTenants((ts) =>
      ts.map((x) => (x.id === t.id ? { ...x, plan: newPlan, mrr: newMRR } : x))
    );
  }

  return (
    <PageShell
      title="Tenants"
      description="Every company on the platform. Suspend, impersonate, change plan, refund — everything starts here."
      actions={
        <button
          type="button"
          onClick={() => exportTenantsCsv(filtered)}
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-rule rounded-[12px] border border-rule overflow-hidden mb-6">
        <Stat
          label="Total tenants"
          value={loading ? "—" : String(tenants.length)}
          hint={loading ? "Loading..." : `${filtered.length} after filter`}
        />
        <Stat label="Combined MRR" value={`$${totalMRR.toLocaleString("en-US")}`} hint="Sum of active plans" />
        <Stat label="Workers hired" value={String(totalWorkers)} hint="Across all tenants" />
        <Stat label="Users" value={String(totalUsers)} hint="Login-active accounts" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUSES.map((s) => {
            const active = status === s;
            const count =
              s === "All" ? tenants.length : tenants.filter((t) => t.status === s).length;
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
                <span className={`font-mono text-[10px] ${active ? "text-white/70" : "text-ink-soft"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {PLANS.map((p) => {
              const active = plan === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={`inline-flex items-center text-[11.5px] font-medium px-2.5 py-1 rounded border transition-colors ${
                    active
                      ? "bg-canvas-soft border-ink text-ink"
                      : "bg-card border-rule text-ink-muted hover:border-ink/25 hover:text-ink"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <div className="inline-flex items-center gap-2 border border-rule rounded-md px-3 h-9 bg-card ml-auto min-w-[260px]">
            <IconSearch className="text-ink-soft shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tenant name, owner email, region..."
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
                <Th>Tenant</Th>
                <Th>Owner · Region</Th>
                <Th>Plan</Th>
                <Th align="right">MRR</Th>
                <Th align="right">Workers</Th>
                <Th align="right">Users</Th>
                <Th>Status</Th>
                <Th>Signed up</Th>
                <Th>{""}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {visible.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-canvas-soft/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/tenants/${t.id}`)}
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="size-8 rounded-md bg-tint/60 border border-rule flex items-center justify-center font-mono text-[10px] font-medium text-ink shrink-0">
                        {t.initials}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-ink truncate">{t.name}</p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft mt-0.5">{t.id}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <p className="text-[12.5px] text-ink truncate">{t.ownerName}</p>
                    <p className="text-[11.5px] text-ink-muted truncate">{t.region}</p>
                  </Td>
                  <Td>
                    <Badge tone={t.plan === "Enterprise" ? "ink" : "neutral"}>{t.plan}</Badge>
                  </Td>
                  <Td align="right">
                    <span className="font-mono text-[12.5px] text-ink tabular-nums">${t.mrr.toLocaleString("en-US")}</span>
                  </Td>
                  <Td align="right">
                    <span className="font-mono text-[12.5px] text-ink tabular-nums">{t.workersHired}</span>
                  </Td>
                  <Td align="right">
                    <span className="font-mono text-[12.5px] text-ink tabular-nums">{t.users}</span>
                  </Td>
                  <Td>
                    <Badge tone={t.status === "Active" ? "accent" : t.status === "Trial" ? "soft" : t.status === "Past due" ? "ink" : "neutral"}>
                      {t.status}
                    </Badge>
                  </Td>
                  <Td>
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft tabular-nums">{t.signedUpAt}</span>
                  </Td>
                  <Td>
                    <RowActions tenant={t} onAction={(kind) => setAction({ kind, tenant: t } as RowAction)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-14 text-[13px] text-ink-muted">No tenants match these filters.</div>
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

      {/* Action modals */}
      {action?.kind === "impersonate" && (
        <ImpersonateModal
          tenant={action.tenant}
          onClose={() => setAction(null)}
          onConfirm={() => {
            setAction(null);
            router.push("/en/app/dashboard");
          }}
        />
      )}
      {action?.kind === "changePlan" && (
        <ChangePlanModal
          tenant={action.tenant}
          onClose={() => setAction(null)}
          onConfirm={(newPlan, newMRR) => {
            doChangePlan(action.tenant, newPlan, newMRR);
            setAction(null);
          }}
        />
      )}
      {action?.kind === "issueCredit" && (
        <IssueCreditModal
          tenant={action.tenant}
          onClose={() => setAction(null)}
        />
      )}
      <ConfirmModal
        open={action?.kind === "suspend"}
        onClose={() => setAction(null)}
        onConfirm={() => {
          if (action?.kind === "suspend") doSuspend(action.tenant);
          setAction(null);
        }}
        title={`Suspend ${action?.kind === "suspend" ? action.tenant.name : ""}?`}
        confirmLabel="Suspend tenant"
        tone="danger"
        body={
          <>
            <p>
              All AI workers will stop responding immediately. Users will see
              a maintenance banner. Billing pauses but historical data
              remains for 90 days.
            </p>
            <p className="mt-3 text-ink-soft font-mono text-[11px] uppercase tracking-[0.1em]">
              Reversible from the tenant detail page.
            </p>
          </>
        }
      />
    </PageShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-2">{label}</p>
      <p className="text-[24px] font-medium tracking-[-0.02em] text-ink leading-none tabular-nums">{value}</p>
      {hint && <p className="text-[11.5px] text-ink-muted mt-2">{hint}</p>}
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft px-4 py-2.5 font-normal ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <td className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}>{children}</td>;
}

function RowActions({
  tenant,
  onAction,
}: {
  tenant: Tenant;
  onAction: (kind: "impersonate" | "changePlan" | "issueCredit" | "suspend") => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-end gap-1 relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors"
        aria-label="More"
      >
        <IconMore width={14} height={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1 w-[200px] bg-card border border-rule rounded-md shadow-[0_8px_24px_-8px_rgba(0,0,0,0.16)] z-40 py-1">
            <Link
              href={`/admin/tenants/${tenant.id}`}
              className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
              onClick={() => setOpen(false)}
            >
              <IconArrowRight width={13} height={13} />
              View details
            </Link>
            <button
              type="button"
              onClick={() => { setOpen(false); onAction("impersonate"); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors text-left"
            >
              Impersonate owner
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); onAction("changePlan"); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors text-left"
            >
              Change plan
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); onAction("issueCredit"); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors text-left"
            >
              Issue credit
            </button>
            <div className="my-1 border-t border-rule" />
            <button
              type="button"
              onClick={() => { setOpen(false); onAction("suspend"); }}
              disabled={tenant.status === "Suspended"}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-[#B91C1C] hover:bg-canvas-soft disabled:opacity-40 transition-colors text-left"
            >
              {tenant.status === "Suspended" ? "Already suspended" : "Suspend tenant"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ImpersonateModal({
  tenant,
  onClose,
  onConfirm,
}: {
  tenant: Tenant;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute inset-0 bg-ink/30 backdrop-blur-sm" />
      <div className="relative bg-card border border-rule rounded-[14px] w-full max-w-[480px] shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)]">
        <header className="px-6 pt-6 pb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#F97316] mb-2 inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[#F97316]" />
              Impersonation · Logged
            </p>
            <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink">
              Sign in as {tenant.ownerName}?
            </h2>
            <p className="text-[12.5px] text-ink-muted mt-1">{tenant.name} · {tenant.ownerEmail}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors">
            <IconClose />
          </button>
        </header>
        <div className="px-6 pb-5 text-[13.5px] text-ink-muted leading-[1.65] space-y-3">
          <p>
            You&apos;ll be redirected to the customer workspace as the owner.
            Every click and mutation is recorded in the platform audit log
            with your staff ID attached.
          </p>
          <div className="rounded-md border border-rule bg-canvas-soft/40 px-4 py-3 space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">Guardrails</p>
            <ul className="text-[12.5px] text-ink leading-[1.6] flex flex-col gap-1">
              <li>· Session capped at 1 hour with automatic logout</li>
              <li>· Cannot change billing details or payment method</li>
              <li>· Cannot delete data or terminate workers</li>
              <li>· Tenant owner receives an email notification</li>
            </ul>
          </div>
        </div>
        <footer className="px-6 py-4 border-t border-rule bg-canvas-soft/60 rounded-b-[14px] flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors">Cancel</button>
          <button type="button" onClick={onConfirm} className="inline-flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors">
            Continue as owner
            <IconArrowRight width={13} height={13} />
          </button>
        </footer>
      </div>
    </div>
  );
}

function ChangePlanModal({
  tenant,
  onClose,
  onConfirm,
}: {
  tenant: Tenant;
  onClose: () => void;
  onConfirm: (plan: Tenant["plan"], mrr: number) => void;
}) {
  const [selected, setSelected] = useState<Tenant["plan"]>(tenant.plan);
  // Plans come from the DB via /api/admin/plans (no more hardcoded array).
  // Loaded once when the modal mounts; tiny payload (<=5 rows typically).
  const [plans, setPlans] = useState<AdminPlanRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/plans", { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status}`);
        const json = (await res.json()) as { plans: AdminPlanRow[] };
        if (!cancelled) {
          // Stable sort: sortOrder asc, then name.
          const rows = [...json.plans].sort(
            (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
          );
          setPlans(rows);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "load failed");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPlan = plans.find((p) => p.name === selected);
  const newMRR = selectedPlan
    ? Math.round(selectedPlan.priceMonthlyCents / 100)
    : tenant.mrr;
  const delta = newMRR - tenant.mrr;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute inset-0 bg-ink/30 backdrop-blur-sm" />
      <div className="relative bg-card border border-rule rounded-[14px] w-full max-w-[520px] shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)] max-h-[90vh] overflow-y-auto">
        <header className="px-6 pt-6 pb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-2">Change plan</p>
            <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink">{tenant.name}</h2>
            <p className="text-[12.5px] text-ink-muted mt-1">Currently on <span className="text-ink">{tenant.plan}</span> · ${tenant.mrr}/mo</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors">
            <IconClose />
          </button>
        </header>
        <div className="px-6 pb-5 flex flex-col gap-2">
          {loadError && (
            <p className="text-[12px] text-[#B91C1C]">Couldn&apos;t load plans: {loadError}</p>
          )}
          {!loadError && plans.length === 0 && (
            <p className="text-[12px] text-ink-soft">Loading plans…</p>
          )}
          {plans.map((p) => {
            const isCurrent = p.name === tenant.plan;
            const isActive = p.name === selected;
            const priceUsd = Math.round(p.priceMonthlyCents / 100);
            const workerLine =
              p.maxWorkers === -1
                ? "Unlimited workers"
                : `Up to ${p.maxWorkers} workers`;
            const seatLine =
              p.maxTeamSeats === -1
                ? "Unlimited team seats"
                : `${p.maxTeamSeats} team seats`;
            return (
              <label
                key={p.id}
                className={`flex items-start justify-between gap-3 px-4 py-3 rounded-md border cursor-pointer transition-colors ${
                  isActive ? "border-ink bg-canvas-soft" : "border-rule hover:border-ink/25"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-ink">{p.name}</p>
                    {isCurrent && <Badge tone="accent">Current</Badge>}
                  </div>
                  <p className="text-[11.5px] text-ink-muted mt-0.5">
                    {workerLine} · {seatLine}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[14px] font-medium text-ink tabular-nums">
                    {priceUsd === 0 ? "Custom" : `$${priceUsd}`}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft mt-0.5">
                    per month
                  </p>
                </div>
                <input
                  type="radio"
                  name="plan"
                  checked={isActive}
                  onChange={() => setSelected(p.name as Tenant["plan"])}
                  className="sr-only"
                />
                <span className={`mt-1.5 size-3.5 rounded-full border-2 shrink-0 ${isActive ? "border-ink bg-ink" : "border-rule"}`} />
              </label>
            );
          })}
        </div>

        {selected !== tenant.plan && (
          <div className="px-6 pb-5">
            <div className="rounded-md border border-rule bg-canvas-soft/40 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-2">Effective immediately</p>
              <dl className="text-[12.5px] text-ink leading-[1.7] grid grid-cols-2 gap-y-1">
                <dt className="text-ink-muted">New MRR</dt><dd className="text-right tabular-nums">${newMRR}</dd>
                <dt className="text-ink-muted">{delta >= 0 ? "Prorated charge today" : "Prorated credit"}</dt><dd className="text-right tabular-nums">{delta >= 0 ? "$" : "−$"}{Math.abs(Math.round(delta * 0.6))}</dd>
                <dt className="text-ink-muted">Audit log entry</dt><dd className="text-right">Will be created</dd>
              </dl>
            </div>
          </div>
        )}

        <footer className="px-6 py-4 border-t border-rule bg-canvas-soft/60 rounded-b-[14px] flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors">Cancel</button>
          <button
            type="button"
            onClick={() => onConfirm(selected, newMRR)}
            disabled={selected === tenant.plan}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Apply change
          </button>
        </footer>
      </div>
    </div>
  );
}

function IssueCreditModal({
  tenant,
  onClose,
}: {
  tenant: Tenant;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("50");
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!amount || !reason.trim()) return;
    setDone(true);
    setTimeout(onClose, 1200);
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute inset-0 bg-ink/30 backdrop-blur-sm" />
      <div className="relative bg-card border border-rule rounded-[14px] w-full max-w-[480px] shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)]">
        <header className="px-6 pt-6 pb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-2">Issue credit</p>
            <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink">{tenant.name}</h2>
            <p className="text-[12.5px] text-ink-muted mt-1">{tenant.ownerEmail}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors">
            <IconClose />
          </button>
        </header>
        {done ? (
          <div className="px-6 py-8 text-center">
            <span className="inline-flex items-center justify-center size-10 rounded-full bg-accent/15 mb-3">
              <IconCheck className="text-accent" width={16} height={16} />
            </span>
            <p className="text-[14px] text-ink font-medium">Credit applied</p>
            <p className="text-[12px] text-ink-muted mt-1">${amount} credit on next invoice · email sent to owner</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="px-6 pb-5 flex flex-col gap-5">
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">Amount</span>
                <div className="flex items-baseline border-b border-rule focus-within:border-ink transition-colors gap-2">
                  <span className="text-[14px] text-ink-soft">$</span>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-[14px] text-ink py-2 border-0 focus:outline-none"
                  />
                  <span className="text-[12px] text-ink-soft pb-2">USD</span>
                </div>
                <span className="text-[11.5px] text-ink-soft">Applied to next invoice. Max $1,000 without senior approval.</span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">Reason (required)</span>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why are you issuing this credit? Visible in audit log."
                  className="bg-transparent text-[13px] text-ink py-2 px-3 border border-rule rounded-md focus:border-ink focus:outline-none transition-colors resize-none placeholder:text-ink-soft"
                />
              </label>
            </div>
            <footer className="px-6 py-4 border-t border-rule bg-canvas-soft/60 rounded-b-[14px] flex items-center justify-end gap-2">
              <button type="button" onClick={onClose} className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors">Cancel</button>
              <button
                type="submit"
                disabled={!amount || !reason.trim()}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <IconCheck width={13} height={13} />
                Apply ${amount || 0} credit
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}

/**
 * CSV export — RFC 4180 escaping (double-quote each field, escape inner
 * quotes). Streams directly to the browser as a Blob; no server hop.
 * The dataset is already loaded into the admin page (admin/tenants
 * fetches the full list), so this stays client-side.
 */
function exportTenantsCsv(rows: Tenant[]): void {
  if (typeof window === "undefined") return;

  const headers = [
    "id",
    "name",
    "slug",
    "plan",
    "status",
    "mrr_usd",
    "workers_hired",
    "users",
    "signed_up_at",
    "region",
    "owner_email",
    "owner_name",
  ];

  const esc = (v: string | number | null | undefined): string => {
    const s = v === null || v === undefined ? "" : String(v);
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const body = rows
    .map((t) =>
      [
        t.id,
        t.name,
        t.slug,
        t.plan,
        t.status,
        t.mrr,
        t.workersHired,
        t.users,
        t.signedUpAt,
        t.region,
        t.ownerEmail,
        t.ownerName,
      ]
        .map(esc)
        .join(","),
    )
    .join("\r\n");

  const csv = `${headers.join(",")}\r\n${body}\r\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `staffbix-tenants-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
