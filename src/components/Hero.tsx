"use client";

import Link from "next/link";
import { Reveal } from "./Reveal";
import { HeroFloatingShowcase } from "./HeroFloatingShowcase";
import {
  BRAND_VERSION,
  PRIMARY_CTA,
  SECONDARY_CTA,
} from "@/lib/brand";
import { useLocale, useLocalizedPath } from "@/lib/i18n/client";
import { getCommonCopy } from "@/lib/i18n/translations";

export function Hero() {
  const locale = useLocale();
  const href = useLocalizedPath();
  const copy = getCommonCopy(locale);

  return (
    <section className="relative pt-8 md:pt-14 lg:pt-16 pb-10 md:pb-14 overflow-hidden">
      {/* ── Soft pastel backdrop ────────────────────────────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,var(--color-lavender)_0%,var(--color-canvas)_70%)]"
      />
      {/* Sky/mint glow accents */}
      <div
        aria-hidden
        className="absolute -top-20 -left-20 w-[420px] h-[420px] rounded-full bg-mint/30 blur-[110px] -z-10"
      />
      <div
        aria-hidden
        className="absolute -top-32 right-0 w-[460px] h-[460px] rounded-full bg-peach/40 blur-[120px] -z-10"
      />

      <div className="relative mx-auto max-w-[1200px] px-6 md:px-10">
        <div className="text-center max-w-[820px] mx-auto">
          <Reveal>
            <div className="inline-flex items-center gap-2 bg-card/70 backdrop-blur-sm border border-rule rounded-full px-3 py-1 mb-6 shadow-sm">
              <span className="size-1.5 rounded-full bg-mint-deep animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                {BRAND_VERSION} · {copy.labels["AI Workforce Platform"]}
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <h1 className="text-[clamp(36px,6vw,64px)] font-medium tracking-[-0.035em] leading-[1.02] text-ink mb-5">
              {copy.tagline}
            </h1>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="text-[15.5px] md:text-[17px] text-ink-muted leading-[1.55] max-w-[600px] mx-auto mb-7">
              {copy.subtagline}
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href={href(PRIMARY_CTA.href)}
                className="inline-flex items-center gap-2 text-[14px] font-medium px-5 py-2.5 rounded-full bg-mint-deep text-ink hover:bg-mint-deep/85 transition-colors shadow-[0_8px_24px_-8px_rgba(52,211,153,0.6)]"
              >
                {copy.cta.primary}
                <span aria-hidden>→</span>
              </Link>
              <Link
                href={href(SECONDARY_CTA.href)}
                className="inline-flex items-center gap-1.5 text-[14px] font-medium text-ink hover:text-ink-muted transition-colors px-5 py-2.5 rounded-full bg-card/80 backdrop-blur-sm border border-rule hover:border-ink/20"
              >
                {copy.cta.secondary}
                <span aria-hidden className="text-ink-muted">
                  →
                </span>
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.28}>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
              {copy.trialLine}
            </p>
          </Reveal>
        </div>

        {/* ── Floating showcase below the headline ───────────────────── */}
        <Reveal delay={0.36} className="mt-10 md:mt-14">
          <HeroFloatingShowcase />
        </Reveal>
      </div>
    </section>
  );
}
