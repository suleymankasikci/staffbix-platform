"use client";

import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { LanguagePicker } from "./LanguagePicker";
import {
  IconX,
  IconLinkedIn,
  IconGitHub,
  IconYouTube,
} from "./SocialIcons";
import { BRAND_NAME, BRAND_VERSION, FOOTER_LINKS } from "@/lib/brand";
import { useLocale, useLocalizedPath } from "@/lib/i18n/client";
import { getCommonCopy } from "@/lib/i18n/translations";

const COLUMNS = [
  FOOTER_LINKS.product,
  FOOTER_LINKS.developers,
  FOOTER_LINKS.company,
  FOOTER_LINKS.legal,
];

const SOCIAL = [
  { ariaLabel: "X", href: "https://x.com/staffbix", Icon: IconX },
  {
    ariaLabel: "LinkedIn",
    href: "https://linkedin.com/company/staffbix",
    Icon: IconLinkedIn,
  },
  { ariaLabel: "GitHub", href: "https://github.com/staffbix", Icon: IconGitHub },
  { ariaLabel: "YouTube", href: "https://youtube.com/@staffbix", Icon: IconYouTube },
];

export function Footer() {
  const locale = useLocale();
  const href = useLocalizedPath();
  const copy = getCommonCopy(locale);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-rule">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 pt-20 md:pt-28 pb-10 md:pb-14">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-10 md:gap-12 mb-16 md:mb-24">
          {/* Brand block */}
          <div className="col-span-2 md:col-span-4 max-w-[360px]">
            <BrandLogo />
            <p className="text-[13.5px] text-ink-muted leading-[1.6] mt-5 mb-6">
              {copy.description}
            </p>
            <LanguagePicker />
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className="col-span-1 md:col-span-2"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft mb-5">
                {copy.footer[col.key as keyof typeof copy.footer]}
              </p>
              <ul className="flex flex-col gap-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={href(l.href)}
                      className="text-[13px] text-ink-muted hover:text-ink transition-colors"
                    >
                      {copy.links[l.key] ?? l.key}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-rule pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            <span>
              © {year} {BRAND_NAME}
            </span>
            <span className="text-ink-soft/60">·</span>
            <span>{BRAND_VERSION}</span>
            <span className="text-ink-soft/60">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
                <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
              </span>
              {copy.labels["All systems operational"]}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {SOCIAL.map(({ ariaLabel, href, Icon }) => (
              <Link
                key={ariaLabel}
                href={href}
                aria-label={ariaLabel}
                className="inline-flex items-center justify-center size-9 rounded-md text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
              >
                <Icon className="size-[15px]" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
