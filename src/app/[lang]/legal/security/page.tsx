import type { Metadata } from "next";
import { LegalLayout, type LegalSection } from "@/components/LegalLayout";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getLegalSecurityPageCopy } from "@/lib/i18n/page-copy";
import { getCommonCopy } from "@/lib/i18n/translations";
import { JsonLd } from "@/components/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo/jsonld";
import { SITE_NAME } from "@/lib/seo/site";

type PageParams = { lang: string };

function pageLocale(params: PageParams): Locale {
  return isLocale(params.lang) ? params.lang : "en";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const locale = pageLocale(await params);
  const copy = getLegalSecurityPageCopy(locale);
  return buildPageMetadata({
    locale,
    path: "legal/security",
    title: copy.metadata.title,
    description: copy.metadata.description,
    keywords: copy.metadata.keywords,
  });
}

export default async function SecurityPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const locale = pageLocale(await params);
  const copy = getLegalSecurityPageCopy(locale);
  const common = getCommonCopy(locale);
  const sections: LegalSection[] = copy.sections.map((section) => ({
    id: section.id,
    title: section.title,
    body: (
      <>
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </>
    ),
  }));

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            locale,
            path: "legal/security",
            title: copy.metadata.title,
            description: copy.metadata.description,
          }),
          breadcrumbJsonLd({
            locale,
            items: [
              { name: SITE_NAME, path: "" },
              { name: common.footer.legal, path: "legal/security" },
              { name: common.links.Security ?? "Security", path: "legal/security" },
            ],
          }),
        ]}
      />
      <LegalLayout
        eyebrow={copy.eyebrow}
        title={copy.title}
        effective={copy.effective}
        intro={copy.intro}
        sections={sections}
        contactLine={copy.contactLine}
        locale={locale}
      />
    </>
  );
}
