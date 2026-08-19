import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact/ContactForm";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getContactPageCopy } from "@/lib/i18n/page-copy";
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
  const copy = getContactPageCopy(locale);
  return buildPageMetadata({
    locale,
    path: "contact",
    title: copy.metadata.title,
    description: copy.metadata.description,
    keywords: copy.metadata.keywords,
  });
}

export default async function ContactPage({ params }: { params: Promise<PageParams> }) {
  const locale = pageLocale(await params);
  const copy = getContactPageCopy(locale);
  const common = getCommonCopy(locale);

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            locale,
            path: "contact",
            title: copy.metadata.title,
            description: copy.metadata.description,
          }),
          breadcrumbJsonLd({
            locale,
            items: [
              { name: SITE_NAME, path: "" },
              { name: common.links.Contact ?? "Contact", path: "contact" },
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

        <section className="py-14 md:py-20">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
              <div className="lg:col-span-7">
                <Reveal>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-6">
                    {copy.form.title}
                  </p>
                </Reveal>

                <ContactForm
                  copy={copy.form}
                  topics={[...copy.topics]}
                  locale={locale}
                />

              </div>

              <aside className="lg:col-span-5">
                <Reveal delay={0.1}>
                  <div className="bg-tint/40 rounded-[18px] p-7 md:p-9">
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted mb-6">
                      {copy.aside.emailTitle}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-2">
                      {copy.aside.directTitle}
                    </p>
                    <ul className="flex flex-col divide-y divide-rule">
                      {copy.direct.map((item) => (
                        <li key={item.value} className="py-4 first:pt-0 last:pb-0">
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-1">
                            {item.label}
                          </p>
                          <a
                            href={`mailto:${item.value}`}
                            className="text-[14px] text-ink font-medium hover:text-ink-muted transition-colors"
                          >
                            {item.value}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>

                <Reveal delay={0.2}>
                  <div className="mt-6 px-7 md:px-9">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-2">
                      {copy.aside.officeTitle}
                    </p>
                    <p className="text-[13px] text-ink-muted leading-[1.6]">
                      {copy.aside.company}
                      <br />
                      {copy.aside.address}
                    </p>
                    <p className="text-[13px] text-ink-muted leading-[1.6] mt-4">
                      {copy.aside.studio}
                    </p>
                  </div>
                </Reveal>

                <Reveal delay={0.28}>
                  <div className="mt-8 px-7 md:px-9">
                    <Link
                      href={localizePath(copy.aside.docsHref, locale)}
                      className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
                    >
                      {copy.aside.docsPrompt}
                      <span aria-hidden>→</span>
                    </Link>
                    <p className="mt-2 text-[12.5px] text-ink-muted">
                      {copy.aside.docsLink}
                    </p>
                  </div>
                </Reveal>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

