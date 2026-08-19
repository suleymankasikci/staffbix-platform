import { PageShell, Card, SectionTitle } from "@/components/app/PageShell";
import {
  HelpAgentTile,
  HelpIndexGrid,
  HelpTopicTile,
  MachineTranslationBanner,
} from "@/components/help/HelpPrimitives";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getAppHelpCopy } from "@/lib/i18n/page-copy";
import { localizePath } from "@/lib/i18n/routing";
import { listTopics, isNativeLocale } from "@/lib/help/resolve";
import { loadCatalogRoles } from "@/lib/roles-server";

// Reads the role catalog from Postgres on render, so it must NOT be
// statically prerendered at build (the DB is unreachable in the build
// container — that crashed the production deploy). Server-render on demand.
export const dynamic = "force-dynamic";

type PageParams = { lang: string };

function pickLocale(params: PageParams): Locale {
  return isLocale(params.lang) ? params.lang : "en";
}

export default async function HelpIndexPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const locale = pickLocale(await params);
  const copy = getAppHelpCopy(locale);
  const topics = listTopics(locale, "user");
  // Catalog roles drive the per-agent help tiles. Loaded server-side
  // so the page renders complete on first paint.
  const roles = await loadCatalogRoles();
  const sortedRoles = [...roles].sort((a, b) =>
    a.title.localeCompare(b.title),
  );

  return (
    <PageShell title={copy.title} description={copy.description}>
      {!isNativeLocale(locale) && (
        <MachineTranslationBanner message={copy.machineTranslationBanner} />
      )}

      <Card padded className="mb-6">
        <SectionTitle label={copy.sections.topics} />
        <HelpIndexGrid>
          {topics.map(({ topic, localized }) => (
            <HelpTopicTile
              key={topic.slug}
              href={localizePath(`/app/help/topics/${topic.slug}`, locale)}
              iconGlyph={topic.iconGlyph}
              title={localized.title}
              tagline={localized.tagline}
            />
          ))}
        </HelpIndexGrid>
      </Card>

      <Card padded>
        <SectionTitle
          label={copy.sections.agents}
          description={copy.sections.agentsDescription}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {sortedRoles.map((role) => (
            <HelpAgentTile
              key={role.slug}
              href={localizePath(`/app/help/agents/${role.slug}`, locale)}
              title={role.title}
              summary={role.summary}
            />
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
