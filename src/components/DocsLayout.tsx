import type { ReactNode } from "react";
import Link from "next/link";
import { type Locale } from "@/lib/i18n/config";
import { getDocsLayoutCopy } from "@/lib/i18n/page-copy";
import { localizePath } from "@/lib/i18n/routing";
import { Footer } from "./Footer";
import { Nav } from "./Nav";

export type DocsLayoutProps = {
  title: string;
  subtitle?: string;
  activeHref: string;
  locale: Locale;
  children: ReactNode;
};

export function DocsLayout({
  title,
  subtitle,
  activeHref,
  locale,
  children,
}: DocsLayoutProps) {
  const copy = getDocsLayoutCopy(locale);

  return (
    <>
      <Nav />
      <main>
        <section className="border-b border-rule">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10 py-10 md:py-14">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-4">
                  {copy.eyebrow}
                </p>
                <h1 className="text-[clamp(28px,4vw,40px)] font-medium tracking-[-0.025em] leading-[1.1] text-ink">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-[14.5px] text-ink-muted leading-[1.6] mt-3 max-w-[560px]">
                    {subtitle}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 self-start md:self-end">
                <SearchBox label={copy.search} shortcut={copy.shortcut} />
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-10 lg:gap-14">
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <nav className="flex flex-col gap-7">
                  {copy.nav.map((section) => (
                    <div key={section.label}>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-3">
                        {section.label}
                      </p>
                      <ul className="flex flex-col gap-2">
                        {section.items.map((item) => {
                          const isActive = item.href === activeHref;
                          return (
                            <li key={item.href}>
                              <Link
                                href={localizePath(item.href, locale)}
                                className={`block text-[13px] transition-colors ${
                                  isActive
                                    ? "text-ink font-medium"
                                    : "text-ink-muted hover:text-ink"
                                }`}
                              >
                                {item.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </nav>
              </aside>

              <article className="max-w-[760px]">{children}</article>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export function DocsCodeBlock({
  code,
  lang,
  label,
  copyLabel,
}: {
  code: string;
  lang: string;
  label?: string;
  copyLabel: string;
}) {
  return (
    <div className="border border-rule rounded-[12px] overflow-hidden bg-canvas-soft my-6">
      <div className="flex items-center justify-between px-4 py-2 border-b border-rule bg-card">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          {label ?? lang}
        </span>
        <button
          type="button"
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
        >
          {copyLabel}
        </button>
      </div>
      <pre className="px-4 py-4 font-mono text-[12.5px] leading-[1.65] text-ink overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function SearchBox({ label, shortcut }: { label: string; shortcut: string }) {
  return (
    <div className="inline-flex items-center gap-2 border border-rule rounded-md px-3 py-2 bg-card min-w-[260px]">
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden
        className="text-ink-soft"
      >
        <circle
          cx="6"
          cy="6"
          r="4.25"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M9.5 9.5L12 12"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[12.5px] text-ink-soft flex-1">{label}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft border border-rule rounded px-1.5 py-0.5">
        {shortcut}
      </span>
    </div>
  );
}
