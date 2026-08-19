import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Problem } from "@/components/Problem";
import { BrandBibleSection } from "@/components/BrandBibleSection";
import { WorkforcePreview } from "@/components/WorkforcePreview";
import { HowItWorks } from "@/components/HowItWorks";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getCommonCopy } from "@/lib/i18n/translations";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { webPageJsonLd } from "@/lib/seo/jsonld";

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
  const copy = getCommonCopy(locale);
  return buildPageMetadata({
    locale,
    path: "",
    title: copy.tagline,
    description: copy.subtagline,
    keywords: copy.homeKeywords,
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const locale = pageLocale(await params);
  const copy = getCommonCopy(locale);

  return (
    <>
      <JsonLd
        data={webPageJsonLd({
          locale,
          path: "",
          title: copy.tagline,
          description: copy.subtagline,
        })}
      />
      <Nav />
      <main>
        <Hero />
        <Problem />
        <BrandBibleSection />
        <WorkforcePreview />
        <HowItWorks />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
