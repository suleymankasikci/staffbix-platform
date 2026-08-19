import { DocsCodeBlock } from "./DocsLayout";

export type DocsArticleSection = {
  heading: string;
  body: string;
  code?: {
    lang: string;
    label: string;
    content: string;
  };
};

export type DocsArticleCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: ReadonlyArray<DocsArticleSection>;
};

/**
 * Renders the standard docs page body: eyebrow, h2 title, intro paragraph,
 * then a stack of (h3 heading, paragraph, optional DocsCodeBlock) sections.
 *
 * Used by every leaf doc page so the layout stays consistent and the
 * per-page files only need to wire copy + DocsLayout.
 */
export function DocsArticle({
  copy,
  copyLabel,
}: {
  copy: DocsArticleCopy;
  copyLabel: string;
}) {
  return (
    <>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-4">
        {copy.eyebrow}
      </p>
      <h2 className="text-[clamp(26px,3.2vw,34px)] font-medium tracking-[-0.025em] leading-[1.12] text-ink mb-5">
        {copy.title}
      </h2>
      <p className="text-[14.5px] text-ink-muted leading-[1.7] mb-10">
        {copy.intro}
      </p>

      {copy.sections.map((section) => (
        <section key={section.heading} className="mb-10">
          <h3 className="text-[20px] md:text-[22px] font-medium tracking-[-0.015em] text-ink mb-3">
            {section.heading}
          </h3>
          <p className="text-[13.5px] text-ink-muted leading-[1.7]">
            {section.body}
          </p>
          {section.code && (
            <DocsCodeBlock
              code={section.code.content}
              lang={section.code.lang}
              label={section.code.label}
              copyLabel={copyLabel}
            />
          )}
        </section>
      ))}
    </>
  );
}
