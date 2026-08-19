import type { Metadata } from "next";
import { LegalLayout, type LegalSection } from "@/components/LegalLayout";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getLegalCookiesPageCopy } from "@/lib/i18n/page-copy";
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
  const copy = getLegalCookiesPageCopy(locale);
  return buildPageMetadata({
    locale,
    path: "legal/cookies",
    title: copy.metadata.title,
    description: copy.metadata.description,
    keywords: copy.metadata.keywords,
  });
}

export default async function CookiesPage({ params }: { params: Promise<PageParams> }) {
  const locale = pageLocale(await params);
  const copy = getLegalCookiesPageCopy(locale);
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
            path: "legal/cookies",
            title: copy.metadata.title,
            description: copy.metadata.description,
          }),
          breadcrumbJsonLd({
            locale,
            items: [
              { name: SITE_NAME, path: "" },
              { name: common.footer.legal, path: "legal/cookies" },
              { name: common.links.Cookies ?? "Cookies", path: "legal/cookies" },
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
        locale={locale}
      />
    </>
  );
}
