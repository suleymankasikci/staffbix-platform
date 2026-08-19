"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PageShell,
  Card,
  SectionTitle,
  Badge,
} from "@/components/app/PageShell";
import { TrendChart } from "@/components/app/TrendChart";
import { ProductTour } from "@/components/app/ProductTour";
import { IconArrowRight, IconPlus, IconBriefing } from "@/components/Icons";
import { useLocale, useLocalizedPath } from "@/lib/i18n/client";
import { getAppDashboardCopy } from "@/lib/i18n/page-copy";
import type { WorkerListRow } from "@/lib/workers/list";

type DashboardCopy = ReturnType<typeof getAppDashboardCopy>;
type ActivityStatusKey = keyof DashboardCopy["activity"]["statuses"];

type ActivityRow = {
  id: string;
  at: string;
  workerName: string;
  kind: string;
  status: string;
  contentExcerpt: string;
};

type ChannelRow = { name: string; count: number };

type DashboardData = {
  kpis: {
    activeWorkers: number;
    pendingApprovals: number;
    messages7d: number;
    aiSpendCentsThisMonth: number;
  };
  workforce: WorkerListRow[];
  recentActivity: ActivityRow[];
  channels: ChannelRow[];
};

const CHANNEL_LABELS: Record<string, string> = {
  web: "Web chat",
  whatsapp: "WhatsApp",
  email: "Email",
  instagram: "Instagram",
  manual: "Manual",
};

/** Map a worker_action.status to the i18n status bucket the page renders. */
function mapActionStatus(s: string): ActivityStatusKey {
  if (s === "pending") return "pending";
  if (s === "sent" || s === "auto" || s === "approved") return "sent";
  // rejected, failed, anything else → fall back to "live" bucket so a
  // valid Badge label still renders.
  return "live";
}

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function DashboardPage() {
  const locale = useLocale();
  const href = useLocalizedPath();
  const copy = getAppDashboardCopy(locale);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled)
            setLoadError(`Failed to load dashboard (HTTP ${res.status}).`);
          return;
        }
        const body = (await res.json()) as DashboardData;
        if (!cancelled) setData(body);
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

  // KPI cells — preserve copy labels, replace values + deltas with live data.
  const kpiCells = useMemo(() => {
    const labels = copy.kpis;
    if (!data) {
      return labels.map((k) => ({ label: k.label, value: "—", delta: k.delta }));
    }
    const messagesLabel = labels[0]?.label ?? "Messages";
    const approvalsLabel = labels[1]?.label ?? "Approvals pending";
    const spendLabel = labels[2]?.label ?? "Spend";
    const voiceLabel = labels[3]?.label ?? "Voice match";
    const messagesDelta = labels[0]?.delta ?? "";
    const approvalsDelta = labels[1]?.delta ?? "";
    const spendDelta = labels[2]?.delta ?? "";
    const voiceDelta = labels[3]?.delta ?? "";
    const spendDollars = (data.kpis.aiSpendCentsThisMonth / 100).toFixed(0);
    return [
      {
        label: messagesLabel,
        value: data.kpis.messages7d.toLocaleString(),
        delta: messagesDelta,
      },
      {
        label: approvalsLabel,
        value: data.kpis.pendingApprovals.toLocaleString(),
        delta: approvalsDelta,
      },
      {
        label: spendLabel,
        value: `$${spendDollars}`,
        delta: spendDelta,
      },
      {
        label: voiceLabel,
        value: data.kpis.activeWorkers.toLocaleString(),
        delta: voiceDelta,
      },
    ];
  }, [data, copy.kpis]);

  // Channels: rebuild rows using API counts + the localized channel labels
  // when available, falling back to the canonical English channel name.
  const channelRows = useMemo(() => {
    if (!data) return [] as Array<{ displayName: string; count: number; pct: number }>;
    const total = data.channels.reduce((s, c) => s + c.count, 0);
    return data.channels.map((c) => {
      const display = CHANNEL_LABELS[c.name] ?? c.name;
      const pct = total === 0 ? 0 : Math.round((c.count / total) * 100);
      return { displayName: display, count: c.count, pct };
    });
  }, [data]);

  // Workforce mini-list — derive a "load" value from messages7d so the
  // existing bar UI keeps working without changing copy.
  const workforceRows = useMemo(() => {
    if (!data) return [] as Array<{ initials: string; displayName: string; load: number }>;
    const max = data.workforce.reduce(
      (m, w) => (w.messages7d > m ? w.messages7d : m),
      0,
    );
    return data.workforce.map((w) => ({
      initials: w.initials,
      displayName: w.name,
      load: max === 0 ? 0 : Math.round((w.messages7d / max) * 100),
    }));
  }, [data]);

  const firstName = "";

  return (
    <PageShell
      title={`${copy.title}${firstName ? ` · ${firstName}` : ""}`}
      description={copy.description}
      actions={
        <>
          <Link
            href={href("/app/workforce/hire")}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
          >
            <IconPlus width={13} height={13} />
            {copy.actions.hireWorker}
          </Link>
          <Link
            href={href("/app/approvals")}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
          >
            {copy.actions.reviewApprovals}
            <IconArrowRight width={13} height={13} />
          </Link>
        </>
      }
    >
      <Card className="mb-6 bg-ink text-white border-ink">
        <div className="flex items-start gap-4">
          <span className="size-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
            <IconBriefing className="text-white" width={18} height={18} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/55 mb-2 inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-accent" />
              {copy.briefing.eyebrow}
            </p>
            <h2 className="text-[18px] md:text-[20px] font-medium tracking-[-0.015em] leading-[1.35] mb-3 max-w-[820px]">
              {copy.briefing.title}
            </h2>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px]">
              <span className="text-white/80">
                <span className="text-white font-medium">+8</span>{" "}
                {copy.briefing.hotLeads}
              </span>
              <span className="text-white/40">{copy.briefing.separator}</span>
              <span className="text-white/80">
                <span className="text-white font-medium">2</span>{" "}
                {copy.briefing.escalations}
              </span>
              <span className="text-white/40">{copy.briefing.separator}</span>
              <span className="text-white/80">
                <span className="text-white font-medium">$43</span>{" "}
                {copy.briefing.spend}
              </span>
              <span className="text-white/40">{copy.briefing.separator}</span>
              <Link
                href={href("/app/logs")}
                className="text-white underline decoration-white/30 decoration-[1.5px] underline-offset-4 hover:decoration-white/60 transition-colors"
              >
                {copy.briefing.read}
              </Link>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-rule rounded-[12px] border border-rule overflow-hidden mb-6">
        {kpiCells.map((k) => (
          <div key={k.label} className="bg-card p-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
              {k.label}
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-[28px] sm:text-[32px] font-medium tracking-[-0.025em] text-ink leading-none">
                {k.value}
              </span>
            </div>
            <p className="text-[11.5px] text-ink-muted mt-2">{k.delta}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <Card className="lg:col-span-2" padded={false}>
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <SectionTitle
              label={copy.trends.title}
              description={copy.trends.description}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink px-2.5 py-1 rounded-full border border-rule bg-canvas-soft"
              >
                {copy.trends.messages}
              </button>
              <button
                type="button"
                className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted hover:text-ink px-2.5 py-1 rounded-full border border-rule transition-colors"
              >
                {copy.trends.approvals}
              </button>
            </div>
          </div>
          <div className="px-3 pb-3">
            <TrendChart data={[...copy.trends.messagesData]} height={180} />
          </div>
          <div className="px-5 pb-5 pt-2 border-t border-rule flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            <span>
              {copy.trends.totalLabel} {copy.briefing.separator}{" "}
              <span className="text-ink">{copy.trends.totalValue}</span>
            </span>
            <span>
              {copy.trends.weeklyLabel} {copy.briefing.separator}{" "}
              <span className="text-ink">{copy.trends.weeklyValue}</span>
            </span>
          </div>
        </Card>

        <Card padded={false}>
          <div className="px-5 pt-5 pb-2">
            <SectionTitle
              label={copy.channels.title}
              description={copy.channels.description}
            />
          </div>
          <ul className="divide-y divide-rule">
            {channelRows.length === 0
              ? copy.channels.rows.map((c) => (
                  <li key={c.displayName} className="px-5 py-3 opacity-60">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-[13px] text-ink font-medium">
                        {c.displayName}
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-ink-muted">
                        — {copy.briefing.separator} —
                      </span>
                    </div>
                    <div className="h-1.5 bg-canvas-soft rounded-full overflow-hidden" />
                  </li>
                ))
              : channelRows.map((c) => (
                  <li key={c.displayName} className="px-5 py-3">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-[13px] text-ink font-medium">
                        {c.displayName}
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-ink-muted">
                        {c.count} {copy.briefing.separator} {c.pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-canvas-soft rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ink rounded-full"
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <SectionTitle
            label={copy.activity.title}
            action={
              <Link
                href={href("/app/conversations")}
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
              >
                {copy.activity.viewAll} <span aria-hidden="true">→</span>
              </Link>
            }
          />
          <Card padded={false}>
            <ul className="divide-y divide-rule">
              {(data?.recentActivity ?? []).map((a) => {
                const statusKey = mapActionStatus(a.status);
                return (
                  <li
                    key={a.id}
                    className="px-5 py-3.5 flex items-start gap-4"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-soft pt-1 w-9 shrink-0 tabular-nums">
                      {formatTimeShort(a.at)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] text-ink-muted leading-[1.5]">
                        <span className="text-ink font-medium">
                          {a.workerName}
                        </span>{" "}
                        <span className="text-ink-soft">
                          {copy.briefing.separator}
                        </span>{" "}
                        {a.contentExcerpt}
                      </p>
                    </div>
                    <Badge tone={statusKey === "pending" ? "soft" : "neutral"}>
                      {copy.activity.statuses[statusKey]}
                    </Badge>
                  </li>
                );
              })}
              {data && data.recentActivity.length === 0 && (
                <li className="px-5 py-6 text-center text-[12.5px] text-ink-muted">
                  —
                </li>
              )}
            </ul>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <SectionTitle
            label={copy.workforce.title}
            action={
              <Link
                href={href("/app/workforce")}
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
              >
                {copy.workforce.manage} <span aria-hidden="true">→</span>
              </Link>
            }
          />
          <Card padded={false}>
            <ul className="divide-y divide-rule">
              {workforceRows.map((w) => (
                <li
                  key={w.displayName}
                  className="px-5 py-3 flex items-center gap-3"
                >
                  <span className="size-7 rounded-full bg-tint/60 border border-rule flex items-center justify-center font-mono text-[9px] font-medium text-ink">
                    {w.initials}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] text-ink font-medium leading-tight truncate">
                      {w.displayName}
                    </p>
                    <div className="mt-1.5 h-[3px] bg-canvas-soft rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ink/80 rounded-full"
                        style={{ width: `${w.load}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-ink-soft tabular-nums shrink-0 w-9 text-right">
                    {w.load}%
                  </span>
                </li>
              ))}
              {data && workforceRows.length === 0 && (
                <li className="px-5 py-6 text-center text-[12.5px] text-ink-muted">
                  —
                </li>
              )}
            </ul>
          </Card>
        </div>
      </div>

      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
        {loading ? "…" : loadError ?? ""}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
        {copy.quickLinks.map((q) => (
          <Link key={q.href} href={href(q.href)} className="block">
            <Card className="hover:bg-canvas-soft transition-colors h-full">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-ink mb-1">
                    {q.label}
                  </p>
                  <p className="text-[12px] text-ink-muted leading-[1.55]">
                    {q.description}
                  </p>
                </div>
                <IconArrowRight className="text-ink-soft shrink-0" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <ProductTour />
    </PageShell>
  );
}
