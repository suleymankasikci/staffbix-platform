"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { PageShell, Card, SectionTitle, Badge } from "@/components/app/PageShell";
import { StatusDot } from "@/components/app/StatusDot";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import { IconEdit, IconTrash } from "@/components/Icons";
import { type HiredWorker } from "@/lib/hired-workers";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getAppWorkerDetailCopy } from "@/lib/i18n/page-copy";
import { localizePath } from "@/lib/i18n/routing";

type PageParams = {
  lang: string;
  id: string;
};

function pageLocale(params: PageParams): Locale {
  return isLocale(params.lang) ? params.lang : "en";
}

export default function WorkerDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const resolvedParams = use(params);
  const locale = pageLocale(resolvedParams);
  const copy = getAppWorkerDetailCopy(locale);
  const { id } = resolvedParams;
  const router = useRouter();
  const [worker, setWorker] = useState<HiredWorker | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [terminate, setTerminate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/workers/${id}?shape=ui`, { cache: "no-store" });
        if (res.status === 404) {
          if (!cancelled) setNotFoundFlag(true);
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as { worker: HiredWorker };
        if (!cancelled) setWorker(data.worker);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function confirmTerminate() {
    if (!worker) return;
    setTerminate(false);
    const res = await fetch(`/api/workers/${worker.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "terminated" }),
    });
    if (res.ok) router.push(localizePath("/app/workforce", locale));
  }

  if (notFoundFlag) notFound();
  if (loading || !worker) {
    return (
      <PageShell
        title={copy.crumbs.workforce}
        crumbs={[{ label: copy.crumbs.workforce, href: localizePath("/app/workforce", locale) }]}
      >
        <p className="text-[13px] text-ink-muted">…</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={worker.name}
      description={`${worker.role} · ${copy.hiredPrefix} ${worker.hiredOn}`}
      crumbs={[
        {
          label: copy.crumbs.workforce,
          href: localizePath("/app/workforce", locale),
        },
        { label: worker.name },
      ]}
      actions={
        <>
          <button
            type="button"
            onClick={() => setTerminate(true)}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full border border-rule text-[#B91C1C] hover:border-[#B91C1C]/40 hover:bg-[#B91C1C]/5 transition-colors"
          >
            <IconTrash width={13} height={13} />
            {copy.actions.terminate}
          </button>
          <Link
            href={localizePath(`/app/workforce/${worker.id}/edit`, locale)}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
          >
            <IconEdit width={13} height={13} />
            {copy.actions.edit}
          </Link>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Worker card */}
        <Card className="lg:col-span-1">
          <div className="flex items-start gap-4 mb-6">
            <span className="size-12 rounded-full bg-tint/60 border border-rule flex items-center justify-center font-mono text-[12px] font-medium text-ink">
              {worker.initials}
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-[18px] font-medium text-ink leading-tight">
                {worker.name}
              </h2>
              <p className="text-[12.5px] text-ink-muted mt-0.5">{worker.role}</p>
              <div className="mt-2">
                <StatusDot status={worker.status} />
              </div>
            </div>
          </div>

          <dl className="flex flex-col divide-y divide-rule -mx-1">
            <Row k={copy.fields.category} v={worker.category} />
            <Row k={copy.fields.schedule} v={worker.schedule} />
            <Row k={copy.fields.approvalMode} v={<Badge tone="soft">{worker.approvalMode}</Badge>} />
            <Row k={copy.fields.workerId} v={<code className="font-mono text-[11px] text-ink-muted">{worker.id}</code>} />
            <Row k={copy.fields.hired} v={worker.hiredOn} />
          </dl>
        </Card>

        {/* KPI + channels */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-px bg-rule rounded-[12px] border border-rule overflow-hidden">
            <Kpi label={copy.kpis.messages} value={worker.messages7d.toLocaleString("en-US")} />
            <Kpi label={copy.kpis.pendingApprovals} value={worker.approvals7d} />
            <Kpi label={copy.kpis.voiceMatch} value={`${worker.voiceMatch}%`} />
          </div>

          <Card>
            <SectionTitle label={copy.channels.title} description={copy.channels.description} />
            <div className="flex flex-wrap gap-1.5">
              {worker.channels.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink bg-canvas-soft border border-rule rounded px-2 py-1"
                >
                  <span className="size-[4px] rounded-full bg-accent" />
                  {c}
                </span>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle label={copy.languages.title} description={copy.languages.description} />
            <div className="flex flex-wrap gap-1.5">
              {worker.languages.map((l) => (
                <span
                  key={l}
                  className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink bg-canvas-soft border border-rule rounded px-2 py-1"
                >
                  {l}
                </span>
              ))}
            </div>
          </Card>

          <Card padded={false}>
            <div className="px-5 pt-5 pb-3">
              <SectionTitle
                label={copy.activity.title}
                action={
                  <Link
                    href={localizePath("/app/conversations", locale)}
                    className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
                  >
                    {copy.actions.viewAll} →
                  </Link>
                }
              />
            </div>
            <ul className="divide-y divide-rule">
              {copy.activity.rows.map((row) => (
                <li key={row.time} className="px-5 py-3 flex items-start gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-soft pt-1 w-9 shrink-0">
                    {row.time}
                  </span>
                  <p className="text-[12.5px] text-ink-muted flex-1 leading-[1.55]">
                    {row.action}
                  </p>
                  <Badge tone="neutral">{row.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={terminate}
        onClose={() => setTerminate(false)}
        onConfirm={() => void confirmTerminate()}
        title={`${copy.modal.titlePrefix} ${worker.name}${copy.modal.titleSuffix}`}
        confirmLabel={copy.modal.confirm}
        tone="danger"
        body={
          <>
            <p>
              {worker.name} {copy.modal.bodyPrefix} {copy.modal.bodySuffix}
            </p>
            <p className="mt-3 text-ink-soft font-mono text-[11px] uppercase tracking-[0.1em]">
              {copy.modal.note}
            </p>
          </>
        }
      />
    </PageShell>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 px-1">
      <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
        {k}
      </dt>
      <dd className="text-[12.5px] text-ink">{v}</dd>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-1.5">
        {label}
      </p>
      <p className="text-[24px] font-medium tracking-[-0.02em] text-ink leading-none">
        {value}
      </p>
    </div>
  );
}
