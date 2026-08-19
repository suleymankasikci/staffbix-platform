import { notFound } from "next/navigation";
import { PageShell, Card, SectionTitle, Badge } from "@/components/app/PageShell";
import {
  HelpSectionView,
  MachineTranslationBanner,
} from "@/components/help/HelpPrimitives";
import { getAppHelpCopy } from "@/lib/i18n/page-copy";
import { loadCatalogRole } from "@/lib/roles-server";
import { getAgentHelp } from "@/lib/help/agents";
import { isNativeLocale } from "@/lib/help/resolve";

// Reads the role catalog from Postgres on render → dynamic, not
// statically prerendered at build (DB unreachable in build container).
export const dynamic = "force-dynamic";

type PageParams = { slug: string };

export default async function AdminHelpAgentPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const resolved = await params;
  const locale = "en";
  const copy = getAppHelpCopy(locale);
  const role = await loadCatalogRole(resolved.slug);
  if (!role) notFound();
  const agent = getAgentHelp(role, locale);

  return (
    <PageShell
      title={agent.title}
      description={agent.tagline}
      crumbs={[
        { label: copy.crumbs.help, href: "/admin/help" },
        { label: copy.crumbs.agents, href: "/admin/help#agents" },
        { label: agent.title },
      ]}
    >
      {!isNativeLocale(locale) && (
        <MachineTranslationBanner message={copy.machineTranslationBanner} />
      )}

      <Card padded className="mb-5 max-w-[760px]">
        <SectionTitle label={copy.agent.whatItDoes} />
        <HelpSectionView section={{ paragraphs: agent.whatItDoes }} />
      </Card>

      <Card padded className="mb-5 max-w-[760px]">
        <SectionTitle label={copy.agent.integrationsRequired} />
        <HelpSectionView section={{ bullets: agent.integrationsRequired }} />
      </Card>

      <Card padded className="mb-5 max-w-[760px]">
        <SectionTitle label={copy.agent.activation} />
        <HelpSectionView section={{ steps: agent.steps }} />
      </Card>

      <Card padded className="mb-5 max-w-[760px]">
        <SectionTitle label={copy.agent.exampleTasks} />
        <HelpSectionView section={{ bullets: agent.exampleTasks }} />
      </Card>

      <Card padded className="mb-5 max-w-[760px]">
        <SectionTitle label={copy.agent.approval} />
        <HelpSectionView section={{ paragraphs: [agent.approvalNote] }} />
      </Card>

      <Card padded className="mb-5 max-w-[760px]">
        <SectionTitle label={copy.agent.tips} />
        <HelpSectionView section={{ bullets: agent.tips }} />
      </Card>

      <div className="max-w-[760px] flex items-center gap-2 mt-2">
        <Badge tone="neutral">{role.category}</Badge>
        {role.channels.map((c) => (
          <Badge key={c} tone="soft">
            {c}
          </Badge>
        ))}
      </div>
    </PageShell>
  );
}
