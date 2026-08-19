import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/app/PageShell";
import type { HelpSection, LocalizedTopic } from "@/lib/help/types";

/**
 * Banner shown at the top of any help page whose content is NOT in the
 * caller's native locale and falls back to English. We tell the reader
 * the content is machine-translated and offer to flag mistakes.
 *
 * Keep it small and non-blocking — operators came to the help page
 * because they're stuck, the banner shouldn't bury the actual answer.
 */
export function MachineTranslationBanner({
  message,
}: {
  message: string;
}) {
  return (
    <div
      role="note"
      className="mb-6 px-4 py-3 rounded-md border border-[#92400E]/25 bg-[#FFFBEB] text-[12.5px] text-[#78350F] flex items-start gap-3"
    >
      <span aria-hidden className="font-mono text-[10px] mt-0.5">
        AI
      </span>
      <p className="leading-[1.5]">{message}</p>
    </div>
  );
}

/**
 * Renders one `HelpSection`. Heading + paragraph + bullets + steps +
 * callout — any combination, in that order. Designed to mirror how
 * docs are usually laid out without needing a full markdown renderer.
 */
export function HelpSectionView({ section }: { section: HelpSection }) {
  return (
    <section className="flex flex-col gap-3">
      {section.heading && (
        <h2 className="text-[16px] font-medium tracking-[-0.01em] text-ink mt-2">
          {section.heading}
        </h2>
      )}
      {section.paragraphs?.map((p, i) => (
        <p key={i} className="text-[13.5px] text-ink-muted leading-[1.65]">
          {p}
        </p>
      ))}
      {section.bullets && section.bullets.length > 0 && (
        <ul className="flex flex-col gap-1.5 pl-4 list-disc marker:text-ink-soft">
          {section.bullets.map((b, i) => (
            <li
              key={i}
              className="text-[13.5px] text-ink-muted leading-[1.6]"
            >
              {b}
            </li>
          ))}
        </ul>
      )}
      {section.steps && section.steps.length > 0 && (
        <ol className="flex flex-col gap-2">
          {section.steps.map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-[13.5px] text-ink leading-[1.6]"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft mt-1 shrink-0 w-5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1">{s}</span>
            </li>
          ))}
        </ol>
      )}
      {section.callout && (
        <div className="px-4 py-3 rounded-md border border-rule bg-canvas-soft/60 text-[13px] text-ink leading-[1.55]">
          {section.callout}
        </div>
      )}
    </section>
  );
}

/**
 * Single-topic page body. Receives a localized topic and renders all
 * its sections in order. The caller (page.tsx) owns the surrounding
 * PageShell + breadcrumbs.
 */
export function HelpTopicBody({
  localized,
  isFallback,
  fallbackMessage,
  children,
}: {
  localized: LocalizedTopic;
  isFallback: boolean;
  fallbackMessage: string;
  /** Optional related-topic links rendered under the body. */
  children?: ReactNode;
}) {
  return (
    <article className="max-w-[760px]">
      {isFallback && <MachineTranslationBanner message={fallbackMessage} />}
      <header className="mb-7">
        <h1 className="text-[26px] md:text-[30px] font-medium tracking-[-0.02em] text-ink leading-[1.15] mb-2">
          {localized.title}
        </h1>
        {localized.tagline && (
          <p className="text-[14px] text-ink-muted leading-[1.6]">
            {localized.tagline}
          </p>
        )}
      </header>
      <div className="flex flex-col gap-7">
        {localized.body.map((section, i) => (
          <HelpSectionView key={i} section={section} />
        ))}
      </div>
      {children}
    </article>
  );
}

/**
 * Tile used on the help index — one per topic. Icons are a single
 * glyph (no SVG file) to keep the index visually consistent across
 * 11 topics without authoring 11 icons.
 */
export function HelpTopicTile({
  href,
  iconGlyph,
  title,
  tagline,
}: {
  href: string;
  iconGlyph: string;
  title: string;
  tagline?: string;
}) {
  return (
    <Link
      href={href}
      className="block group bg-card border border-rule rounded-[12px] p-5 hover:border-ink/25 hover:bg-canvas-soft/40 transition-colors"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="inline-flex items-center justify-center size-9 rounded-md bg-tint/40 border border-rule text-[16px] text-ink font-medium shrink-0"
        >
          {iconGlyph}
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-ink leading-tight mb-1 group-hover:text-ink">
            {title}
          </p>
          {tagline && (
            <p className="text-[12.5px] text-ink-muted leading-[1.55] line-clamp-3">
              {tagline}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * Index card grid wrapper.
 */
export function HelpIndexGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {children}
    </div>
  );
}

/**
 * "Related agents" tile grid shown on the help index. Compact form so
 * we can show all 64 roles without overwhelming.
 */
export function HelpAgentTile({
  href,
  title,
  summary,
}: {
  href: string;
  title: string;
  summary: string;
}) {
  return (
    <Link
      href={href}
      className="block group bg-card border border-rule rounded-md px-3 py-2.5 hover:border-ink/25 hover:bg-canvas-soft/40 transition-colors"
    >
      <p className="text-[13px] font-medium text-ink leading-tight mb-1">
        {title}
      </p>
      <p className="text-[11.5px] text-ink-muted leading-[1.5] line-clamp-2">
        {summary}
      </p>
    </Link>
  );
}

/**
 * Wraps the body in a default Card so callers can drop a topic page
 * into any shell without needing to re-style.
 */
export function HelpCard({ children }: { children: ReactNode }) {
  return <Card>{children}</Card>;
}
