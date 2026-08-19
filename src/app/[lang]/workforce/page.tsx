import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getWorkforcePageCopy } from "@/lib/i18n/page-copy";
import { getCommonCopy } from "@/lib/i18n/translations";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PageHeader } from "@/components/PageHeader";
import { WorkforceCatalog } from "@/components/WorkforceCatalog";
import { FinalCTA } from "@/components/FinalCTA";
import { JsonLd } from "@/components/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo/jsonld";
import { SITE_NAME } from "@/lib/seo/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "en";
  const copy = getWorkforcePageCopy(locale);
  return buildPageMetadata({
    locale,
    path: "workforce",
    title: copy.metadata.title,
    description: copy.metadata.description,
    keywords: copy.metadata.keywords,
  });
}

export default async function WorkforcePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "en";
  const copy = getWorkforcePageCopy(locale);
  const common = getCommonCopy(locale);

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            locale,
            path: "workforce",
            title: copy.metadata.title,
            description: copy.metadata.description,
          }),
          breadcrumbJsonLd({
            locale,
            items: [
              { name: SITE_NAME, path: "" },
              { name: common.links.Workforce ?? "Workforce", path: "workforce" },
            ],
          }),
        ]}
      />
      <Nav />
      <main>
        <PageHeader
          eyebrow={copy.header.eyebrow}
          title={copy.header.title}
          sub={copy.header.sub}
        />
        <WorkforceCatalog />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
