"use client";

import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { PRIMARY_CTA } from "@/lib/brand";
import { useLocale, useLocalizedPath } from "@/lib/i18n/client";
import { getCommonCopy } from "@/lib/i18n/translations";

export default function NotFound() {
  const locale = useLocale();
  const href = useLocalizedPath();
  const copy = getCommonCopy(locale);

  return (
    <>
      <Nav />
      <main className="min-h-[70vh] flex items-center justify-center px-6 md:px-10">
        <div className="max-w-[520px] mx-auto text-center py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-6">
            {copy.labels["404 page"]}
          </p>
          <h1 className="text-[clamp(32px,4.6vw,48px)] font-medium tracking-[-0.025em] leading-[1.08] text-ink mb-5">
            {copy.labels["Page not shipped"]}
          </h1>
          <p className="text-[14.5px] text-ink-muted leading-[1.6] mb-9 max-w-[400px] mx-auto">
            {copy.labels["Page placeholder note"]}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={href("/")}
              className="inline-flex items-center text-[13.5px] font-medium px-5 py-2.5 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
            >
              {copy.labels["Back home"]}
            </Link>
            <Link
              href={href(PRIMARY_CTA.href)}
              className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink hover:text-ink-muted transition-colors px-5 py-2.5 rounded-full border border-rule hover:border-ink/20"
            >
              {copy.cta.primary}
              <span aria-hidden className="text-ink-muted">
                →
              </span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
