"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PageShell,
  Card,
  SectionTitle,
  Badge,
} from "@/components/app/PageShell";
import { TrendChart, type TrendPoint } from "@/components/app/TrendChart";
import { IconArrowRight } from "@/components/Icons";

interface TrendBucket {
  bucket: string;
  value?: number;
  valueCents?: number;
}

interface PlanMixRow {
  planId: string;
  planName: string;
  count: number;
  mrrCents: number;
  pct: number;
}

const WEEK_LABEL = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const DAY_LABEL = new Intl.DateTimeFormat("en-US", { weekday: "short" });

function mrrSeriesFrom(rows: TrendBucket[]): TrendPoint[] {
  return rows.map((r) => ({
    label: WEEK_LABEL.format(new Date(r.bucket)),
    value: Math.round((r.valueCents ?? 0) / 100),
  }));
}
function signupsSeriesFrom(rows: TrendBucket[]): TrendPoint[] {
  return rows.map((r) => ({
    label: DAY_LABEL.format(new Date(r.bucket)),
    value: r.value ?? 0,
  }));
}

interface RecentSignup {
  id: string;
  name: string;
  slug: string;
  planId: string;
  planName: string;
  status: string;
  country: string | null;
  createdAt: string;
}
interface RecentInvoice {
  id: string;
  tenantId: string;
  tenantName: string;
  planId: string;
  amountCents: number;
  currency: string;
  status: string;
  issuedAt: string | null;
  paidAt: string | null;
}
interface RecentTicket {
  id: string;
  code: string;
  tenantId: string;
  tenantName: string;
  subject: string;
  priority: string;
  status: string;
  channel: string;
  reporterName: string;
  reporterEmail: string;
  createdAt: string;
  updatedAt: string;
}
interface RecentAudit {
  id: string;
  kind: string;
  createdAt: string;
  ip: string | null;
  tenantId: string | null;
  tenantName: string | null;
  userId: string | null;
  userName: string | null;
  payload: unknown;
}
interface DashboardPayload {
  totals: {
    tenants: number;
    activeTenants: number;
    mrrCents: number;
    openTickets: number;
  };
  mrrTrend: TrendBucket[];
  signupsTrend: TrendBucket[];
  planMix: PlanMixRow[];
  recentSignups: RecentSignup[];
  recentInvoices: RecentInvoice[];
  recentTickets: RecentTicket[];
  recentAudit: RecentAudit[];
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as
          | DashboardPayload
          | { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(
            ("error" in body && body.error) || "Couldn't load dashboard.",
          );
          return;
        }
        setData(body as DashboardPayload);
      } catch {
        if (!cancelled) setLoadError("Network error loading dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = data?.totals;
  const recentSignups = data?.recentSignups ?? [];
  const openTickets = (data?.recentTickets ?? []).filter(
    (t) => t.status === "open" || t.status === "pending",
  );
  const failedInvoices = (data?.recentInvoices ?? []).filter(
    (i) => i.status === "failed" || i.status === "past_due",
  );
  const recentAudit = (data?.recentAudit ?? []).slice(0, 6);
  const mrrTrend = useMemo(
    () => mrrSeriesFrom(data?.mrrTrend ?? []),
    [data?.mrrTrend],
  );
  const signupsTrend = useMemo(
    () => signupsSeriesFrom(data?.signupsTrend ?? []),
    [data?.signupsTrend],
  );
  const planMix = data?.planMix ?? [];

  const kpis = [
    {
      label: "MRR",
      value: totals ? `$${(totals.mrrCents / 100).toLocaleString("en-US")}` : "—",
      delta: loading ? "Loading…" : "Live",
    },
    {
      label: "Active tenants",
      value: totals ? `${totals.activeTenants} / ${totals.tenants}` : "—",
      delta: totals
        ? `${totals.tenants - totals.activeTenants} inactive`
        : "Loading…",
    },
    {
      label: "Trial → paid",
      value: "11.8%",
      delta: "Last 30 days",
    },
    {
      label: "Open tickets",
      value: totals ? String(totals.openTickets) : "—",
      delta: loading ? "Loading…" : "Across all tenants",
    },
  ];

  return (
    <PageShell
      title="Platform overview"
      description="MRR, signups, support load, and platform health. Updated in near real-time."
      actions={
        <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          <span className="size-1.5 rounded-full bg-accent" />
          All systems operational
        </span>
      }
    >
      {loadError && (
        <div className="mb-5 text-[13px] text-[#B91C1C] bg-[#FEE2E2] border border-[#B91C1C]/25 rounded-md px-3 py-2">
          {loadError}
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-rule rounded-[12px] border border-rule overflow-hidden mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-card p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-2">
              {k.label}
            </p>
            <p className="text-[28px] font-medium tracking-[-0.025em] text-ink leading-none tabular-nums">
              {k.value}
            </p>
            <p className="text-[11.5px] text-ink-muted mt-2">{k.delta}</p>
          </div>
        ))}
      </div>

      {/* MRR + Signups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <Card className="lg:col-span-2" padded={false}>
          <div className="px-5 pt-5 pb-3">
            <SectionTitle
              label="MRR · last 7 weeks"
              description="Net monthly recurring revenue, USD."
            />
          </div>
          <div className="px-3 pb-3">
            {mrrTrend.length > 0 ? (
              <TrendChart data={mrrTrend} height={180} unit="$" />
            ) : (
              <div className="px-5 py-12 text-center text-[12px] text-ink-soft">
                No paid invoices in the last 7 weeks yet.
              </div>
            )}
          </div>
        </Card>

        <Card padded={false}>
          <div className="px-5 pt-5 pb-3">
            <SectionTitle
              label="Signups · last 7 days"
              description="Including trials."
            />
          </div>
          <div className="px-3 pb-3">
            {signupsTrend.length > 0 ? (
              <TrendChart data={signupsTrend} height={180} />
            ) : (
              <div className="px-5 py-12 text-center text-[12px] text-ink-soft">
                No signups in the last 7 days.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Plan mix */}
      <Card padded={false} className="mb-6">
        <div className="px-5 pt-5 pb-3 flex items-baseline justify-between">
          <SectionTitle
            label="Plan mix · paying customers"
            description="Distribution of active subscriptions across tiers."
          />
          <Link
            href="/admin/plans"
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
          >
            Manage plans →
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-rule border-y border-rule">
          {planMix.length === 0 ? (
            <div className="bg-card p-5 col-span-full text-[12px] text-ink-soft text-center">
              No plans configured yet.
            </div>
          ) : (
            planMix.map((p) => (
              <div key={p.planId} className="bg-card p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-1.5">
                  {p.planName}
                </p>
                <p className="text-[22px] font-medium tracking-[-0.02em] text-ink leading-none tabular-nums">
                  {p.count}
                </p>
                <p className="text-[11.5px] text-ink-muted mt-2">
                  ${(p.mrrCents / 100).toLocaleString("en-US")} MRR · {p.pct}%
                </p>
                <div className="mt-3 h-1 bg-canvas-soft rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ink rounded-full"
                    style={{ width: `${Math.max(0, Math.min(100, p.pct))}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Activity panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* New tenants */}
        <Card padded={false}>
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <SectionTitle
              label="Recent signups"
              description={`${totals?.tenants ?? "—"} total tenants.`}
            />
            <Link
              href="/admin/tenants"
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
            >
              All →
            </Link>
          </div>
          <ul className="divide-y divide-rule">
            {recentSignups.slice(0, 5).map((t) => (
              <li key={t.id}>
                <Link
                  href={`/admin/tenants/${t.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-canvas-soft/50 transition-colors"
                >
                  <span className="size-8 rounded-md bg-tint/60 border border-rule flex items-center justify-center font-mono text-[10px] font-medium text-ink shrink-0">
                    {initialsOf(t.name)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate">
                      {t.name}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft mt-0.5">
                      {t.country ?? "—"} · {t.planName}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft tabular-nums">
                    {t.createdAt.slice(0, 10)}
                  </span>
                </Link>
              </li>
            ))}
            {!loading && recentSignups.length === 0 && (
              <li className="px-5 py-8 text-center text-[13px] text-ink-muted">
                No signups yet.
              </li>
            )}
          </ul>
        </Card>

        {/* Tickets */}
        <Card padded={false}>
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <SectionTitle
              label="Open tickets"
              description={`${openTickets.length} need attention.`}
            />
            <Link
              href="/admin/support"
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
            >
              Queue →
            </Link>
          </div>
          <ul className="divide-y divide-rule">
            {openTickets.slice(0, 5).map((t) => (
              <li key={t.id}>
                <Link
                  href={`/admin/support/${t.id}`}
                  className="block px-5 py-3 hover:bg-canvas-soft/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[12.5px] font-medium text-ink truncate">
                      {t.subject}
                    </p>
                    <Badge
                      tone={
                        t.priority === "critical" || t.priority === "high"
                          ? "ink"
                          : "neutral"
                      }
                    >
                      {t.priority}
                    </Badge>
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                    {t.reporterName}
                  </p>
                </Link>
              </li>
            ))}
            {!loading && openTickets.length === 0 && (
              <li className="px-5 py-8 text-center text-[13px] text-ink-muted">
                Nothing in the queue.
              </li>
            )}
          </ul>
        </Card>

        {/* Recent audit */}
        <Card padded={false}>
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <SectionTitle
              label="Audit · recent"
              description="Staff actions across the platform."
            />
            <Link
              href="/admin/audit"
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
            >
              Full log →
            </Link>
          </div>
          <ul className="divide-y divide-rule">
            {recentAudit.map((a) => (
              <li key={a.id} className="px-5 py-3">
                <p className="text-[12.5px] text-ink-muted leading-[1.5]">
                  <span className="text-ink font-medium">
                    {a.userName ?? "System"}
                  </span>{" "}
                  <span className="text-ink-soft">·</span> {a.kind}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft mt-0.5">
                  {a.tenantName ?? "—"}
                </p>
              </li>
            ))}
            {!loading && recentAudit.length === 0 && (
              <li className="px-5 py-8 text-center text-[13px] text-ink-muted">
                No audit events yet.
              </li>
            )}
          </ul>
        </Card>
      </div>

      {/* Failed payments alert */}
      {failedInvoices.length > 0 && (
        <Card className="mt-6 border-[#F97316]/40 bg-[#F97316]/[0.04]">
          <div className="flex items-start gap-4">
            <span className="size-10 rounded-full bg-[#F97316]/15 flex items-center justify-center shrink-0">
              <span className="size-2 rounded-full bg-[#F97316] animate-pulse" />
            </span>
            <div className="flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#F97316] mb-1.5">
                Finance · {failedInvoices.length} invoices need attention
              </p>
              <h3 className="text-[15px] font-medium text-ink leading-tight mb-2">
                Failed payments and past-due invoices
              </h3>
              <p className="text-[12.5px] text-ink-muted leading-[1.6]">
                {failedInvoices
                  .map((i) => i.id.slice(0, 8))
                  .join(" · ")}{" "}
                · Total at risk: $
                {(
                  failedInvoices.reduce((sum, i) => sum + i.amountCents, 0) /
                  100
                ).toLocaleString("en-US")}
              </p>
            </div>
            <Link
              href="/admin/billing"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3.5 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors shrink-0"
            >
              Review
              <IconArrowRight width={12} height={12} />
            </Link>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
