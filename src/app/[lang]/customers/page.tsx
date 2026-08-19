import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getCustomersPageCopy } from "@/lib/i18n/page-copy";
import { getCommonCopy } from "@/lib/i18n/translations";
import { localizePath } from "@/lib/i18n/routing";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PageHeader } from "@/components/PageHeader";
import { FinalCTA } from "@/components/FinalCTA";
import { Reveal } from "@/components/Reveal";
import { JsonLd } from "@/components/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo/jsonld";
import { SITE_NAME } from "@/lib/seo/site";

type Study = {
  company: string;
  sector: string;
  founder: string;
  role: string;
  metric: string;
  metricLabel: string;
  quote: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "en";
  const copy = getCustomersPageCopy(locale);
  return buildPageMetadata({
    locale,
    path: "customers",
    title: copy.metadata.title,
    description: copy.metadata.description,
    keywords: copy.metadata.keywords,
  });
}

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "en";
  const copy = getCustomersPageCopy(locale);
  const common = getCommonCopy(locale);

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            locale,
            path: "customers",
            title: copy.metadata.title,
            description: copy.metadata.description,
          }),
          breadcrumbJsonLd({
            locale,
            items: [
              { name: SITE_NAME, path: "" },
              {
                name: common.links.Customers ?? "Customers",
                path: "customers",
              },
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

        <section className="py-14 md:py-20">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            {copy.studies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-rule border border-rule rounded-[14px] overflow-hidden">
                {(copy.studies as readonly Study[]).map((s, i) => (
                  <Reveal key={s.company} delay={0.04 + i * 0.04}>
                    <StudyCard study={s} readStory={copy.readStory} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <Reveal>
                <div className="border border-rule rounded-[14px] bg-card px-8 py-14 md:px-12 md:py-20 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-3">
                    {copy.header.eyebrow}
                  </p>
                  <h2 className="text-[22px] md:text-[26px] font-medium tracking-[-0.01em] text-ink mb-3">
                    {copy.emptyState.title}
                  </h2>
                  <p className="text-[14px] text-ink-muted leading-[1.6] max-w-[640px] mx-auto">
                    {copy.emptyState.body}
                  </p>
                </div>
              </Reveal>
            )}

            <Reveal delay={0.4}>
              <div className="mt-12 md:mt-16 text-center">
                <Link
                  href={localizePath(copy.cta.href, locale)}
                  className="inline-flex items-center gap-2 text-[13.5px] font-medium text-ink hover:text-ink-muted transition-colors border border-rule rounded-full px-5 py-2.5 hover:border-ink/20"
                >
                  {copy.cta.label}
                  <span aria-hidden className="text-ink-muted">
                    →
                  </span>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}

function StudyCard({
  study,
  readStory,
}: {
  study: Study;
  readStory: string;
}) {
  return (
    <article className="h-full bg-card p-8 sm:p-10 md:p-12 flex flex-col">
      <div className="flex items-start justify-between gap-6 mb-7 md:mb-10">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-2">
            {study.sector}
          </p>
          <h3 className="text-[20px] font-medium tracking-[-0.015em] text-ink">
            {study.company}
          </h3>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[40px] md:text-[48px] font-medium tracking-[-0.03em] leading-none text-ink">
            {study.metric}
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft mt-2 max-w-[140px] leading-tight">
            {study.metricLabel}
          </p>
        </div>
      </div>

      <blockquote className="text-[16px] md:text-[17px] text-ink leading-[1.55] flex-1 font-light">
        &ldquo;{study.quote}&rdquo;
      </blockquote>

      <div className="mt-8 pt-6 border-t border-rule flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-ink">{study.founder}</p>
          <p className="text-[12px] text-ink-muted">{study.role}</p>
        </div>
        <Link
          href="#"
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
        >
          {readStory} →
        </Link>
      </div>
    </article>
  );
}
