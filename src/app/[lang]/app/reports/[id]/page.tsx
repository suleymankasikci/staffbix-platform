"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import {
  PageShell,
  Card,
  SectionTitle,
  Badge,
} from "@/components/app/PageShell";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import {
  IconArrowRight,
  IconEdit,
  IconTrash,
  IconCheck,
} from "@/components/Icons";
import {
  findReport,
  reportRuns,
  type ReportRun,
} from "@/lib/reports-data";
import { useLocale, useLocalizedPath } from "@/lib/i18n/client";
import { getReportDetailCopy } from "@/lib/i18n/page-copy";

type ReportDetailCopy = ReturnType<typeof getReportDetailCopy>;

function formatDateTime(iso: string, dateLocale: string) {
  const d = new Date(iso);
  return d.toLocaleString(dateLocale, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const locale = useLocale();
  const href = useLocalizedPath();
  const copy = getReportDetailCopy(locale);
  const report = findReport(id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);

  if (!report) notFound();

  const runs = reportRuns(report.id);
  const lastRun = runs[0];
  const successRate = runs.length
    ? Math.round((runs.filter((r) => r.status === "Sent").length / runs.length) * 100)
    : 100;

  return (
    <PageShell
      title={report.name}
      description={report.description}
      crumbs={[
        { label: copy.crumbs.reports, href: href("/app/reports") },
        { label: report.name },
      ]}
      actions={
        <>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full border border-rule text-[#B91C1C] hover:border-[#B91C1C]/40 hover:bg-[#B91C1C]/5 transition-colors"
          >
            <IconTrash width={13} height={13} />
            {copy.actions.delete}
          </button>
          <button
            type="button"
            onClick={() => setPauseOpen(true)}
            className="inline-flex items-center text-[13px] font-medium px-3.5 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
          >
            {report.status === "Active" ? copy.actions.pause : copy.actions.activate}
          </button>
          <Link
            href={href(`/app/reports/${report.id}/edit`)}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
          >
            <IconEdit width={13} height={13} />
            {copy.actions.edit}
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
          >
            {copy.actions.runNow}
            <IconArrowRight width={13} height={13} />
          </button>
        </>
      }
    >
      {/* Overview KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-rule rounded-[12px] border border-rule overflow-hidden mb-6">
        <Kpi
          label={copy.kpis.status}
          value={report.status === "Active" ? copy.statuses.active : report.status}
          accent={report.status === "Active"}
        />
        <Kpi
          label={copy.kpis.cadence}
          value={report.cadence}
          hint={report.cadenceTime}
        />
        <Kpi
          label={copy.kpis.sentAllTime}
          value={report.totalSent.toLocaleString(copy.dateLocale)}
          hint={`${successRate}% ${copy.kpis.deliverySuccess}`}
        />
        <Kpi
          label={copy.kpis.avgOpenRate}
          value={`${report.avgOpenRate}%`}
          hint={copy.kpis.last90Days}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: details */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Sections */}
          <Card>
            <SectionTitle
              label={copy.content.title}
              description={`${report.sections.length} ${
                report.sections.length === 1
                  ? copy.content.sectionSingular
                  : copy.content.sectionPlural
              } ${copy.content.included}`}
            />
            <div className="flex flex-wrap gap-1.5">
              {report.sections.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink bg-canvas-soft border border-rule rounded px-2 py-1"
                >
                  <IconCheck className="text-accent" width={11} height={11} />
                  {s}
                </span>
              ))}
            </div>
          </Card>

          {/* Recipients */}
          <Card padded={false}>
            <div className="px-5 pt-5 pb-3 flex items-baseline justify-between">
              <SectionTitle
                label={`${copy.recipients.title} · ${report.recipients.length}`}
                description={copy.recipients.description}
              />
              <Link
                href={href(`/app/reports/${report.id}/edit`)}
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
              >
                {copy.recipients.edit} →
              </Link>
            </div>
            <ul className="divide-y divide-rule">
              {report.recipients.map((rec) => {
                const initials = (rec.name ?? rec.email)
                  .split(/[\s.@]/)
                  .map((s) => s[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <li
                    key={rec.email}
                    className="px-5 py-3.5 flex items-center gap-3"
                  >
                    <span className="size-8 rounded-full bg-tint/60 border border-rule flex items-center justify-center font-mono text-[10px] font-medium text-ink shrink-0">
                      {initials || copy.recipients.initialsFallback}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-ink truncate">
                        {rec.name ?? rec.email}
                      </p>
                      <p className="text-[11.5px] text-ink-muted truncate">
                        {rec.email}
                        {rec.role && (
                          <>
                            <span className="text-ink-soft/60 mx-1.5">·</span>
                            {rec.role}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {rec.cuts && rec.cuts.length > 0 ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                          {rec.cuts.length} {copy.recipients.of}{" "}
                          {report.sections.length} {copy.recipients.sections}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                          {copy.recipients.fullReport}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Delivery history */}
          <Card padded={false}>
            <div className="px-5 pt-5 pb-3 flex items-baseline justify-between">
              <SectionTitle
                label={`${copy.history.title} · ${runs.length}`}
                description={copy.history.description}
              />
              <button
                type="button"
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
              >
                {copy.history.exportCsv} →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-canvas-soft/60 border-y border-rule text-left">
                    <th className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft px-5 py-2.5 font-normal">
                      {copy.history.sentAt}
                    </th>
                    <th className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft px-5 py-2.5 font-normal text-right">
                      {copy.history.recipients}
                    </th>
                    <th className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft px-5 py-2.5 font-normal text-right">
                      {copy.history.opens}
                    </th>
                    <th className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft px-5 py-2.5 font-normal text-right">
                      {copy.history.size}
                    </th>
                    <th className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft px-5 py-2.5 font-normal">
                      {copy.history.status}
                    </th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {runs.map((run) => (
                    <RunRow key={run.id} run={run} copy={copy} />
                  ))}
                </tbody>
              </table>
              {runs.length === 0 && (
                <div className="text-center py-10 text-[13px] text-ink-muted">
                  {copy.history.noRuns}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right: meta + preview */}
        <div className="flex flex-col gap-5">
          {/* Schedule meta */}
          <Card>
            <SectionTitle label={copy.details.schedule} />
            <dl className="flex flex-col divide-y divide-rule -mx-1">
              <Detail k={copy.details.cadence} v={report.cadence} />
              {report.cadenceTime && <Detail k={copy.details.when} v={report.cadenceTime} />}
              <Detail
                k={copy.details.lastSent}
                v={lastRun ? formatDateTime(lastRun.ranAt, copy.dateLocale) : "—"}
              />
              <Detail
                k={copy.details.nextRun}
                v={
                  report.nextRunAt
                    ? formatDateTime(report.nextRunAt, copy.dateLocale)
                    : copy.details.onDemandOnly
                }
              />
              <Detail k={copy.details.created} v={report.createdAt} />
              <Detail k={copy.details.createdBy} v={report.createdBy} />
              <Detail
                k={copy.details.reportId}
                v={
                  <code className="font-mono text-[11px] text-ink-muted">
                    {report.id}
                  </code>
                }
              />
            </dl>
          </Card>

          {/* Delivery channels */}
          <Card>
            <SectionTitle label={copy.details.channels} />
            <div className="flex flex-wrap gap-1.5">
              {report.channels.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink bg-canvas-soft border border-rule rounded px-2 py-1"
                >
                  <span className="size-[5px] rounded-full bg-accent" />
                  {c}
                </span>
              ))}
            </div>
          </Card>

          {/* Preview */}
          <Card>
            <SectionTitle
              label={copy.details.preview}
              description={copy.details.previewDescription}
            />
            <PreviewMockup name={report.name} sections={report.sections} copy={copy} />
            <Link
              href="#"
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink hover:text-ink-muted transition-colors"
            >
              {copy.details.openPreview}
              <IconArrowRight width={12} height={12} />
            </Link>
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          router.push(href("/app/reports"));
        }}
        title={`${copy.deleteModal.titlePrefix} "${report.name}"${copy.deleteModal.titleSuffix}`}
        confirmLabel={copy.deleteModal.confirm}
        tone="danger"
        body={
          <p>
            {copy.deleteModal.body}
          </p>
        }
      />

      <ConfirmModal
        open={pauseOpen}
        onClose={() => setPauseOpen(false)}
        onConfirm={() => setPauseOpen(false)}
        title={`${report.status === "Active" ? copy.actions.pause : copy.actions.activate} "${report.name}"${copy.statusModal.titleSuffix}`}
        confirmLabel={report.status === "Active" ? copy.actions.pause : copy.actions.activate}
        body={
          <p>
            {report.status === "Active"
              ? copy.statusModal.pauseBody
              : copy.statusModal.activateBody}
          </p>
        }
      />
    </PageShell>
  );
}

function RunRow({ run, copy }: { run: ReportRun; copy: ReportDetailCopy }) {
  const openRate =
    run.recipientCount > 0
      ? Math.round((run.opens / run.recipientCount) * 100)
      : 0;
  return (
    <tr className="hover:bg-canvas-soft/50 transition-colors">
      <td className="px-5 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink tabular-nums">
          {formatDateTime(run.ranAt, copy.dateLocale)}
        </p>
        <p className="font-mono text-[10px] text-ink-soft mt-0.5">
          {run.id}
        </p>
      </td>
      <td className="px-5 py-3 text-right">
        <span className="font-mono text-[12.5px] text-ink tabular-nums">
          {run.recipientCount}
        </span>
      </td>
      <td className="px-5 py-3 text-right">
        <span className="font-mono text-[12.5px] text-ink tabular-nums">
          {run.opens} / {run.recipientCount}
        </span>
        <p className="font-mono text-[10px] text-ink-soft mt-0.5">
          {openRate}%
        </p>
      </td>
      <td className="px-5 py-3 text-right">
        <span className="font-mono text-[11.5px] text-ink-muted tabular-nums">
          {run.attachmentKB ? `${(run.attachmentKB / 1024).toFixed(1)} MB` : "—"}
        </span>
      </td>
      <td className="px-5 py-3">
        {run.status === "Sent" && <Badge tone="accent">{copy.statuses.sent}</Badge>}
        {run.status === "Failed" && (
          <span className="inline-flex items-center font-mono text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded border bg-[#FEE2E2] text-[#B91C1C] border-[#B91C1C]/25">
            {copy.statuses.failed}
          </span>
        )}
        {run.status === "Pending" && <Badge tone="soft">{copy.statuses.pending}</Badge>}
      </td>
      <td className="px-5 py-3 text-right">
        <button
          type="button"
          className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted hover:text-ink transition-colors"
        >
          {copy.history.download}
        </button>
      </td>
    </tr>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-2">
        {label}
      </p>
      <p
        className={`text-[20px] sm:text-[22px] font-medium tracking-[-0.02em] leading-none ${
          accent ? "text-accent" : "text-ink"
        }`}
      >
        {value}
      </p>
      {hint && (
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft mt-2">
          {hint}
        </p>
      )}
    </div>
  );
}

function Detail({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 px-1">
      <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
        {k}
      </dt>
      <dd className="text-[12.5px] text-ink text-right">{v}</dd>
    </div>
  );
}

function PreviewMockup({
  name,
  sections,
  copy,
}: {
  name: string;
  sections: string[];
  copy: ReportDetailCopy;
}) {
  return (
    <div className="border border-rule rounded-[10px] overflow-hidden bg-canvas-soft/40">
      <div className="px-4 py-3 border-b border-rule bg-card flex items-center gap-2">
        <span className="flex gap-1">
          <span className="size-1.5 rounded-full bg-rule" />
          <span className="size-1.5 rounded-full bg-rule" />
          <span className="size-1.5 rounded-full bg-rule" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft truncate">
          {copy.details.subject} {name}
        </span>
      </div>
      <div className="p-4 flex flex-col gap-2.5">
        {sections.slice(0, 5).map((s) => (
          <div key={s} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="size-1 rounded-full bg-accent" />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink">
                {s}
              </span>
            </div>
            <div className="ml-3 flex flex-col gap-1">
              <div className="h-1.5 rounded-full bg-rule/80 w-[95%]" />
              <div className="h-1.5 rounded-full bg-rule/80 w-[78%]" />
              <div className="h-1.5 rounded-full bg-rule/80 w-[60%]" />
            </div>
          </div>
        ))}
        {sections.length > 5 && (
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft mt-1">
            + {sections.length - 5} {copy.details.moreSections}
          </p>
        )}
      </div>
    </div>
  );
}
