"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { LanguagePicker } from "./LanguagePicker";
import { NAV_LINKS, PRIMARY_CTA, LOGIN_CTA } from "@/lib/brand";
import { useLocale, useLocalizedPath } from "@/lib/i18n/client";
import { getCommonCopy } from "@/lib/i18n/translations";

export function Nav() {
  const locale = useLocale();
  const href = useLocalizedPath();
  const copy = getCommonCopy(locale);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 transition-[background,backdrop-filter,border-color] duration-200 ${
        scrolled || open
          ? "bg-canvas/90 backdrop-blur-md border-b border-rule-soft"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 h-16 md:h-[72px] flex items-center justify-between">
        <BrandLogo />

        <nav className="hidden md:flex items-center gap-8 lg:gap-10 absolute left-1/2 -translate-x-1/2">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={href(l.href)}
              className="text-[13px] text-ink-muted hover:text-ink transition-colors"
            >
              {copy.links[l.key] ?? l.key}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3 lg:gap-4">
          {/* Language picker to the left of Login on desktop. Opens
              downward so the panel doesn't render above the page. */}
          <LanguagePicker placement="down" />
          <Link
            href={href(LOGIN_CTA.href)}
            className="text-[13px] text-ink-muted hover:text-ink transition-colors"
          >
            {copy.cta.login}
          </Link>
          <Link
            href={href(PRIMARY_CTA.href)}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
          >
            {copy.cta.primary}
          </Link>
        </div>

        {/* Mobile + tablet (<md): compact picker sits to the LEFT of
            the hamburger. Compact variant drops the long label so the
            trigger stays narrow on 360px viewports. */}
        <div className="md:hidden flex items-center gap-2">
          <LanguagePicker placement="down" variant="compact" />
          <button
            aria-label={open ? copy.labels["Close menu"] : copy.labels["Open menu"]}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex flex-col justify-center gap-[5px] p-2 -mr-2 w-10 h-10"
          >
            <span
              className={`block h-px w-5 bg-ink transition-transform duration-200 ${
                open ? "translate-y-[3px] rotate-45" : ""
              }`}
            />
            <span
              className={`block h-px w-5 bg-ink transition-transform duration-200 ${
                open ? "-translate-y-[3px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-rule bg-canvas">
          <div className="px-6 py-10 flex flex-col gap-7 min-h-[calc(100vh-4rem)]">
            <nav className="flex flex-col gap-6">
              {NAV_LINKS.map((l, i) => (
                <Link
                  key={l.href}
                  href={href(l.href)}
                  className="text-[26px] font-medium text-ink tracking-[-0.015em]"
                  onClick={() => setOpen(false)}
                  style={{
                    animation: `mobileFade 0.4s ease ${i * 0.05}s both`,
                  }}
                >
                  {copy.links[l.key] ?? l.key}
                </Link>
              ))}
            </nav>
            <div className="mt-auto pt-6 border-t border-rule flex flex-col gap-3">
              <Link
                href={href(LOGIN_CTA.href)}
                className="text-[14px] text-ink-muted py-2"
                onClick={() => setOpen(false)}
              >
                {copy.cta.login}
              </Link>
              <Link
                href={href(PRIMARY_CTA.href)}
                className="text-[14px] font-medium px-4 py-3 rounded-full bg-ink text-white text-center"
                onClick={() => setOpen(false)}
              >
                {copy.cta.primary}
              </Link>
            </div>
          </div>

          <style jsx>{`
            @keyframes mobileFade {
              from {
                opacity: 0;
                transform: translateY(8px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      )}
    </header>
  );
}
