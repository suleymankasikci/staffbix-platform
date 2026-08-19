import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getBrandBiblePageCopy } from "@/lib/i18n/page-copy";
import { getCommonCopy } from "@/lib/i18n/translations";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PageHeader } from "@/components/PageHeader";
import { FinalCTA } from "@/components/FinalCTA";
import { Reveal } from "@/components/Reveal";
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
  const copy = getBrandBiblePageCopy(locale);
  return buildPageMetadata({
    locale,
    path: "brand-bible",
    title: copy.metadata.title,
    description: copy.metadata.description,
    keywords: copy.metadata.keywords,
  });
}

export default async function BrandBiblePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "en";
  const copy = getBrandBiblePageCopy(locale);
  const common = getCommonCopy(locale);

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            locale,
            path: "brand-bible",
            title: copy.metadata.title,
            description: copy.metadata.description,
          }),
          breadcrumbJsonLd({
            locale,
            items: [
              { name: SITE_NAME, path: "" },
              {
                name: common.links["Brand Bible"] ?? "Brand Bible",
                path: "brand-bible",
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

        {/* Bible card preview */}
        <section className="py-14 md:py-20">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <Reveal>
              <div className="bg-card border border-rule rounded-[14px] overflow-hidden max-w-[840px] mx-auto shadow-[0_1px_0_rgba(0,0,0,0.02),0_24px_60px_-30px_rgba(15,23,42,0.18)]">
                <div className="flex items-center justify-between px-5 py-3 border-b border-rule">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                    {copy.preview.file}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
                    {copy.preview.progress}
                  </span>
                </div>
                <ul className="divide-y divide-rule">
                  {copy.preview.fields.map((f, i) => (
                    <li
                      key={f.key}
                      className="grid grid-cols-[110px_1fr_auto] sm:grid-cols-[160px_1fr_auto] items-center gap-4 px-5 py-3.5"
                    >
                      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                        {String(i + 1).padStart(2, "0")} · {f.key}
                      </span>
                      <span className="text-[13px] text-ink leading-snug">
                        {f.value}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-accent">
                        {copy.preview.synced}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Sources */}
        <section className="py-20 md:py-28 border-t border-rule">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="max-w-[760px] mb-14 md:mb-16">
              <Reveal>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-5">
                  {copy.ingestion.eyebrow}
                </p>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="text-[clamp(26px,3.6vw,36px)] font-medium tracking-[-0.025em] leading-[1.15] text-ink mb-4">
                  {copy.ingestion.title}
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="text-[15px] text-ink-muted leading-[1.65] max-w-[560px]">
                  {copy.ingestion.body}
                </p>
              </Reveal>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-rule border border-rule rounded-[14px] overflow-hidden">
              {copy.ingestion.sources.map((s, i) => (
                <Reveal key={s.title} delay={0.04 + i * 0.04}>
                  <div className="bg-card p-6 md:p-7 h-full">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-3">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <h3 className="text-[17px] font-medium tracking-[-0.01em] text-ink mb-2.5">
                      {s.title}
                    </h3>
                    <p className="text-[13.5px] text-ink-muted leading-[1.65]">
                      {s.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Principles */}
        <section className="py-20 md:py-28 border-t border-rule">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="bg-tint/40 rounded-[24px] px-7 sm:px-10 md:px-16 py-14 md:py-20">
              <div className="max-w-[680px] mb-12">
                <Reveal>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted mb-5">
                    {copy.principles.eyebrow}
                  </p>
                </Reveal>
                <Reveal delay={0.05}>
                  <h2 className="text-[clamp(26px,3.6vw,36px)] font-medium tracking-[-0.025em] leading-[1.15] text-ink">
                    {copy.principles.title}
                  </h2>
                </Reveal>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 lg:gap-x-16 gap-y-10">
                {copy.principles.items.map((p, i) => (
                  <Reveal key={p.title} delay={0.04 + i * 0.04}>
                    <article>
                      <div className="flex items-baseline gap-3 mb-3">
                        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <h3 className="text-[17px] font-medium tracking-[-0.01em] text-ink leading-[1.3]">
                          {p.title}
                        </h3>
                      </div>
                      <p className="text-[13.5px] text-ink-muted leading-[1.7] max-w-[440px]">
                        {p.body}
                      </p>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
