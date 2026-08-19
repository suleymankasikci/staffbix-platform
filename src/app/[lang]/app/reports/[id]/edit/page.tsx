"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/app/PageShell";
import { ReportForm } from "@/components/app/ReportForm";
import { findReport } from "@/lib/reports-data";
import { useLocale, useLocalizedPath } from "@/lib/i18n/client";
import { getAppReportEditorCopy } from "@/lib/i18n/page-copy";

export default function EditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = useLocale();
  const localize = useLocalizedPath();
  const copy = getAppReportEditorCopy(locale);
  const { id } = use(params);
  const report = findReport(id);
  if (!report) notFound();

  return (
    <PageShell
      title={`${copy.editTitlePrefix} ${report.name}`}
      description={copy.editDescription}
      crumbs={[
        { label: copy.crumbs.reports, href: localize("/app/reports") },
        { label: report.name, href: localize(`/app/reports/${report.id}`) },
        { label: copy.crumbs.edit },
      ]}
    >
      <ReportForm
        mode="edit"
        initial={report}
        cancelHref={`/app/reports/${report.id}`}
      />
    </PageShell>
  );
}
