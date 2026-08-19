import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell, Card } from "@/components/app/PageShell";
import { HelpTopicBody } from "@/components/help/HelpPrimitives";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getAppHelpCopy } from "@/lib/i18n/page-copy";
import { localizePath } from "@/lib/i18n/routing";
import { listTopics, resolveTopic } from "@/lib/help/resolve";

type PageParams = { lang: string; slug: string };

function pickLocale(p: PageParams): Locale {
  return isLocale(p.lang) ? p.lang : "en";
}

export default async function HelpTopicPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const resolved = await params;
  const locale = pickLocale(resolved);
  const copy = getAppHelpCopy(locale);
  const result = resolveTopic(resolved.slug, locale, "user");
  if (!result) notFound();
  const { topic, localized, isFallback } = result;

  // Show 3 sibling topics as "related" — same audience, different slug.
  const related = listTopics(locale, "user")
    .filter((t) => t.topic.slug !== topic.slug)
    .slice(0, 3);

  return (
    <PageShell
      title={localized.title}
      crumbs={[
        { label: copy.crumbs.help, href: localizePath("/app/help", locale) },
        { label: localized.title },
      ]}
    >
      <Card padded>
        <HelpTopicBody
          localized={localized}
          isFallback={isFallback}
          fallbackMessage={copy.machineTranslationBanner}
        >
          {related.length > 0 && (
            <footer className="mt-10 pt-6 border-t border-rule">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-3">
                {copy.relatedTopics}
              </p>
              <ul className="flex flex-col gap-2">
                {related.map((r) => (
                  <li key={r.topic.slug}>
                    <Link
                      href={localizePath(
                        `/app/help/topics/${r.topic.slug}`,
                        locale,
                      )}
                      className="text-[13px] text-ink hover:text-ink-muted transition-colors inline-flex items-center gap-1.5"
                    >
                      <span
                        aria-hidden
                        className="inline-flex items-center justify-center size-5 rounded bg-tint/40 text-[10px] text-ink-muted"
                      >
                        {r.topic.iconGlyph}
                      </span>
                      {r.localized.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </footer>
          )}
        </HelpTopicBody>
      </Card>
    </PageShell>
  );
}
