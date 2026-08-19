import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getChangelogPageCopy } from "@/lib/i18n/page-copy";
import { getCommonCopy } from "@/lib/i18n/translations";
import { localizePath } from "@/lib/i18n/routing";
import { JsonLd } from "@/components/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo/jsonld";
import { SITE_NAME } from "@/lib/seo/site";

type PageParams = { lang: string };

const TAG_STYLE = {
  added: "bg-accent/12 text-accent border-accent/25",
  improved: "bg-tint/60 text-ink border-tint-deep/30",
  fixed: "bg-canvas-soft text-ink-muted border-rule",
  security: "bg-ink text-white border-ink",
} as const;

type Tag = keyof typeof TAG_STYLE;

function pageLocale(params: PageParams): Locale {
  return isLocale(params.lang) ? params.lang : "en";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const locale = pageLocale(await params);
  const copy = getChangelogPageCopy(locale);
  return buildPageMetadata({
    locale,
    path: "changelog",
    title: copy.metadata.title,
    description: copy.metadata.description,
    ogType: "article",
    keywords: copy.metadata.keywords,
  });
}

export default async function ChangelogPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const locale = pageLocale(await params);
  const copy = getChangelogPageCopy(locale);
  const common = getCommonCopy(locale);

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            locale,
            path: "changelog",
            title: copy.metadata.title,
            description: copy.metadata.description,
          }),
          breadcrumbJsonLd({
            locale,
            items: [
              { name: SITE_NAME, path: "" },
              {
                name: common.links.Changelog ?? "Changelog",
                path: "changelog",
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
          align="left"
        />

        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10 lg:gap-16">
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-4">
                  {copy.sidebar.title}
                </p>
                <nav className="flex flex-col gap-2">
                  {copy.entries.map((entry) => (
                    <a
                      key={entry.version}
                      href={`#${entry.version}`}
                      className="flex items-baseline justify-between gap-3 text-[13px] text-ink-muted hover:text-ink transition-colors group"
                    >
                      <span className="font-mono text-[11px] text-ink group-hover:text-ink">
                        {entry.version}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                        {entry.date.split(",")[0]}
                      </span>
                    </a>
                  ))}
                </nav>
                <div className="mt-8 pt-7 border-t border-rule">
                  <Link
                    href={localizePath(copy.sidebar.rssHref, locale)}
                    className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors inline-flex items-center gap-1.5"
                  >
                    {copy.sidebar.rss}
                    <span aria-hidden>↗</span>
                  </Link>
                </div>
              </aside>

              <div className="max-w-[760px]">
                {copy.entries.map((entry, index) => (
                  <Reveal key={entry.version} delay={0.04 + index * 0.03}>
                    <article
                      id={entry.version}
                      className="pb-12 md:pb-16 mb-12 md:mb-16 border-b border-rule last:border-0 last:mb-0 last:pb-0 scroll-mt-24"
                    >
                      <div className="flex items-center gap-3 mb-5">
                        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink bg-canvas-soft border border-rule rounded-md px-2 py-0.5">
                          {entry.version}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                          {entry.date}
                        </span>
                      </div>

                      <h2 className="text-[clamp(22px,2.8vw,28px)] font-medium tracking-[-0.02em] leading-[1.2] text-ink mb-4">
                        {entry.title}
                      </h2>
                      <p className="text-[14.5px] text-ink-muted leading-[1.7] mb-8 max-w-[640px]">
                        {entry.summary}
                      </p>

                      <ul className="flex flex-col gap-3">
                        {entry.changes.map((change, changeIndex) => {
                          const tag = change.tag as Tag;

                          return (
                            <li key={changeIndex} className="flex items-start gap-3">
                              <span
                                className={`shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 rounded border ${TAG_STYLE[tag]} mt-px`}
                              >
                                {copy.tagLabels[tag]}
                              </span>
                              <span className="text-[13.5px] text-ink leading-[1.6]">
                                {change.text}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
