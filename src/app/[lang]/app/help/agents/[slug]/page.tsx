import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell, Card, SectionTitle, Badge } from "@/components/app/PageShell";
import {
  HelpSectionView,
  MachineTranslationBanner,
} from "@/components/help/HelpPrimitives";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getAppHelpCopy } from "@/lib/i18n/page-copy";
import { localizePath } from "@/lib/i18n/routing";
import { loadCatalogRole } from "@/lib/roles-server";
import { getAgentHelp } from "@/lib/help/agents";
import { isNativeLocale } from "@/lib/help/resolve";

// Reads the role catalog from Postgres on render → must be dynamic, not
// statically prerendered at build (DB unreachable in build container).
export const dynamic = "force-dynamic";

type PageParams = { lang: string; slug: string };

function pickLocale(p: PageParams): Locale {
  return isLocale(p.lang) ? p.lang : "en";
}

export default async function HelpAgentPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const resolved = await params;
  const locale = pickLocale(resolved);
  const copy = getAppHelpCopy(locale);
  const role = await loadCatalogRole(resolved.slug);
  if (!role) notFound();
  const agent = getAgentHelp(role, locale);

  return (
    <PageShell
      title={agent.title}
      description={agent.tagline}
      crumbs={[
        { label: copy.crumbs.help, href: localizePath("/app/help", locale) },
        {
          label: copy.crumbs.agents,
          href: localizePath("/app/help#agents", locale),
        },
        { label: agent.title },
      ]}
      actions={
        role.status === "available" ? (
          <Link
            href={localizePath(`/app/workforce/hire/${role.slug}`, locale)}
            className="inline-flex items-center text-[13px] font-medium px-3.5 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
          >
            {copy.agent.hireCta}
          </Link>
        ) : null
      }
    >
      {!isNativeLocale(locale) && (
        <MachineTranslationBanner message={copy.machineTranslationBanner} />
      )}

      <Card padded className="mb-5 max-w-[760px]">
        <SectionTitle label={copy.agent.whatItDoes} />
        <HelpSectionView
          section={{ paragraphs: agent.whatItDoes }}
        />
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
        <HelpSectionView
          section={{ paragraphs: [agent.approvalNote] }}
        />
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
