import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getPressPageCopy } from "@/lib/i18n/page-copy";
import { getCommonCopy } from "@/lib/i18n/translations";
import { localizePath } from "@/lib/i18n/routing";
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
  const copy = getPressPageCopy(locale);
  return buildPageMetadata({
    locale,
    path: "press",
    title: copy.metadata.title,
    description: copy.metadata.description,
    keywords: copy.metadata.keywords,
  });
}

export default async function PressPage({ params }: { params: Promise<PageParams> }) {
  const locale = pageLocale(await params);
  const copy = getPressPageCopy(locale);
  const common = getCommonCopy(locale);

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            locale,
            path: "press",
            title: copy.metadata.title,
            description: copy.metadata.description,
          }),
          breadcrumbJsonLd({
            locale,
            items: [
              { name: SITE_NAME, path: "" },
              { name: common.links.Press ?? "Press", path: "press" },
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
            <div className="border border-rule rounded-[18px] p-7 md:p-10 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-end">
              <div className="md:col-span-7">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-3">
                  {copy.contact.title}
                </p>
                <h2 className="text-[clamp(22px,2.8vw,28px)] font-medium tracking-[-0.02em] leading-[1.2] text-ink mb-2">
                  {copy.contact.heading}
                </h2>
                <p className="text-[13.5px] text-ink-muted leading-[1.6] max-w-[460px]">
                  {copy.contact.body}
                </p>
              </div>
              <div className="md:col-span-5 flex flex-col gap-3">
                <a
                  href={`mailto:${copy.contact.email}`}
                  className="inline-flex items-center justify-center text-[13.5px] font-medium px-5 py-3 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
                >
                  {copy.contact.email}
                </a>
                <Link
                  href={localizePath(copy.contact.founderHref, locale)}
                  className="inline-flex items-center justify-center gap-1.5 text-[13.5px] font-medium text-ink hover:text-ink-muted transition-colors px-5 py-3 rounded-full border border-rule hover:border-ink/20"
                >
                  {copy.contact.founderStory}
                  <span aria-hidden className="text-ink-muted">
                    →
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 border-t border-rule">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-8">
                {copy.factsTitle}
              </p>
            </Reveal>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-rule border border-rule rounded-[14px] overflow-hidden">
              {copy.facts.map((fact) => (
                <Reveal key={fact.label}>
                  <div className="bg-card p-5 md:p-6 h-full">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-2">
                      {fact.label}
                    </p>
                    <p className="text-[15px] font-medium tracking-[-0.01em] text-ink leading-tight">
                      {fact.value}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 border-t border-rule">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="flex items-end justify-between mb-10">
              <div>
                <Reveal>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-3">
                    {copy.assetsTitle}
                  </p>
                </Reveal>
                <Reveal delay={0.05}>
                  <h2 className="text-[clamp(24px,3vw,32px)] font-medium tracking-[-0.025em] leading-[1.15] text-ink">
                    {copy.assetsSub}
                  </h2>
                </Reveal>
              </div>
              <Reveal delay={0.1}>
                <a
                  href="/press/staffbix-press-kit.zip"
                  className="hidden sm:inline-flex font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors items-center gap-2"
                >
                  {copy.fullKit}
                  <span aria-hidden className="text-ink">
                    ↓
                  </span>
                </a>
              </Reveal>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-rule border border-rule rounded-[14px] overflow-hidden">
              {copy.assets.map((asset, index) => (
                <Reveal key={asset.name} delay={0.04 + index * 0.03}>
                  <a
                    href={asset.href}
                    className="group flex flex-col h-full p-6 bg-card hover:bg-canvas-soft transition-colors"
                  >
                    <div className="aspect-[5/3] bg-tint/40 rounded-[8px] mb-5 flex items-center justify-center">
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                        {asset.name}
                      </span>
                    </div>
                    <h3 className="text-[15px] font-medium tracking-[-0.01em] text-ink mb-1.5">
                      {asset.name}
                    </h3>
                    <p className="text-[12.5px] text-ink-muted leading-[1.55] mb-5">
                      {asset.desc}
                    </p>
                    <span className="mt-auto font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted group-hover:text-ink transition-colors inline-flex items-center gap-1.5">
                      {copy.download}
                      <span aria-hidden>↓</span>
                    </span>
                  </a>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 border-t border-rule">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-8">
                {copy.coverageTitle}
              </p>
            </Reveal>
            <ul className="border border-rule rounded-[14px] overflow-hidden divide-y divide-rule">
              {copy.coverage.map((item) => (
                <li key={item.headline}>
                  <a
                    href="#"
                    className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-6 px-6 py-5 hover:bg-canvas-soft transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-1.5">
                        {item.outlet} · {item.date}
                      </p>
                      <p className="text-[15px] text-ink leading-snug group-hover:text-ink-muted transition-colors">
                        {item.headline}
                      </p>
                    </div>
                    <span
                      aria-hidden
                      className="text-ink-soft group-hover:text-ink transition-colors text-[16px] shrink-0"
                    >
                      →
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
