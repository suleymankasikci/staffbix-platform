"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLocale, useLocalizedPath } from "@/lib/i18n/client";
import { getCommonCopy } from "@/lib/i18n/translations";

type Crumb = { label: string; href?: string };

type PageShellProps = {
  title: string;
  description?: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
  children: ReactNode;
};

export function PageShell({
  title,
  description,
  crumbs,
  actions,
  children,
}: PageShellProps) {
  const href = useLocalizedPath();
  const locale = useLocale();
  const copy = getCommonCopy(locale);

  return (
    <div className="px-5 md:px-7 lg:px-10 py-8 md:py-10 max-w-[1400px] mx-auto">
      <header className="mb-8 md:mb-10">
        {crumbs && crumbs.length > 0 && (
          <nav
            aria-label={copy.labels.Breadcrumb}
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-3"
          >
            <ol className="flex flex-wrap items-center gap-2">
              {crumbs.map((c, i) => (
                <li key={i} className="inline-flex items-center gap-2">
                  {c.href ? (
                    <Link
                      href={href(c.href)}
                      className="hover:text-ink transition-colors"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span>{c.label}</span>
                  )}
                  {i < crumbs.length - 1 && (
                    <span className="text-ink-soft/60">/</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div className="max-w-[680px]">
            <h1 className="text-[clamp(22px,2.6vw,28px)] font-medium tracking-[-0.02em] leading-[1.2] text-ink">
              {title}
            </h1>
            {description && (
              <p className="text-[13.5px] text-ink-muted leading-[1.6] mt-2">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      </header>

      {children}
    </div>
  );
}

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`bg-card border border-rule rounded-[12px] ${
        padded ? "p-5 md:p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  label,
  description,
  action,
}: {
  label: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-1">
          {label}
        </p>
        {description && (
          <p className="text-[13px] text-ink-muted leading-[1.55]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "ink" | "soft";
}) {
  const styles = {
    neutral: "text-ink-muted bg-canvas-soft border-rule",
    accent: "text-accent bg-accent/10 border-accent/25",
    ink: "text-white bg-ink border-ink",
    soft: "text-ink bg-tint/60 border-tint-deep/30",
  } as const;
  return (
    <span
      className={`inline-flex items-center font-mono text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded border ${styles[tone]}`}
    >
      {children}
    </span>
  );
}
