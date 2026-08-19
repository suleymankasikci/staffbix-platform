import { PageShell } from "@/components/app/PageShell";
import { ReportForm } from "@/components/app/ReportForm";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getAppReportEditorCopy } from "@/lib/i18n/page-copy";
import { localizePath } from "@/lib/i18n/routing";

type PageParams = {
  lang: string;
};

type ReportSearchParams = {
  template?: string;
};

type AsyncPageParams = Promise<PageParams>;
type AsyncReportSearchParams = Promise<ReportSearchParams>;

type NewReportPageProps = {
  params: AsyncPageParams;
  searchParams: AsyncReportSearchParams;
};

function pageLocale(params: PageParams): Locale {
  return isLocale(params.lang) ? params.lang : "en";
}

export default async function NewReportPage({
  params,
  searchParams,
}: NewReportPageProps) {
  const locale = pageLocale(await params);
  const copy = getAppReportEditorCopy(locale);
  const sp = await searchParams;
  return (
    <PageShell
      title={copy.newTitle}
      description={copy.newDescription}
      crumbs={[
        { label: copy.crumbs.reports, href: localizePath("/app/reports", locale) },
        { label: copy.crumbs.new },
      ]}
    >
      <ReportForm
        mode="create"
        initialTemplateSlug={sp.template}
        cancelHref="/app/reports"
      />
    </PageShell>
  );
}
