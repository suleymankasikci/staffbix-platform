import { PageShell, Card, SectionTitle } from "@/components/app/PageShell";
import {
  HelpAgentTile,
  HelpIndexGrid,
  HelpTopicTile,
  MachineTranslationBanner,
} from "@/components/help/HelpPrimitives";
import { getAppHelpCopy } from "@/lib/i18n/page-copy";
import { listTopics, isNativeLocale } from "@/lib/help/resolve";
import { loadCatalogRoles } from "@/lib/roles-server";

/**
 * Admin help index. Same content engine as the user help center plus
 * the admin-audience topics (`admin-panel-tour` for now; more to come).
 * Admin staff serve customers using the same agents customers hire, so
 * the agent guides are identical.
 *
 * Locale fixed to "en" for now — admin staff are bilingual EN/TR by
 * policy, and the admin panel doesn't carry a language picker. If the
 * panel grows a picker, swap this for the URL locale.
 */
// Reads the role catalog from Postgres on render → dynamic, not
// statically prerendered at build (DB unreachable in build container).
export const dynamic = "force-dynamic";

export default async function AdminHelpIndexPage() {
  const locale = "en";
  const copy = getAppHelpCopy(locale);
  const topics = listTopics(locale, "admin");
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
              href={`/admin/help/topics/${topic.slug}`}
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
              href={`/admin/help/agents/${role.slug}`}
              title={role.title}
              summary={role.summary}
            />
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
