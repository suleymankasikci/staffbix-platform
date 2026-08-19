import { notFound } from "next/navigation";
import { PageShell, Card, SectionTitle, Badge } from "@/components/app/PageShell";
import { WorkerHireForm } from "@/components/app/WorkerHireForm";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getWorkforceHireRoleCopy } from "@/lib/i18n/page-copy";
import { localizePath } from "@/lib/i18n/routing";
import { loadCatalogRole } from "@/lib/roles-server";
import { getRoleConfig, type RoleSpecificField } from "@/lib/role-configs";
import { NotifyMeButton } from "@/components/app/NotifyMeButton";

// Loads the role from Postgres on render → keep it server-rendered on
// demand, never statically prerendered (DB is unreachable at build time).
export const dynamic = "force-dynamic";

type PageParams = {
  lang: string;
  slug: string;
};

function pageLocale(params: PageParams): Locale {
  return isLocale(params.lang) ? params.lang : "en";
}

export default async function HireRolePage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const resolvedParams = await params;
  const locale = pageLocale(resolvedParams);
  const copy = getWorkforceHireRoleCopy(locale);
  const { slug } = resolvedParams;
  const role = await loadCatalogRole(slug);
  if (!role) notFound();
  const config = getRoleConfig(role);

  const title = `${copy.titlePrefix} ${role.title}`;

  if (role.status === "q3") {
    return (
      <PageShell
        title={title}
        description={role.summary}
        crumbs={[
          {
            label: copy.crumbs.workforce,
            href: localizePath("/app/workforce", locale),
          },
          {
            label: copy.crumbs.hire,
            href: localizePath("/app/workforce/hire", locale),
          },
          { label: role.title },
        ]}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Coming soon notice */}
          <Card className="lg:col-span-1">
            <Badge tone="ink">{copy.q3.badge}</Badge>
            <h2 className="text-[20px] font-medium tracking-[-0.015em] text-ink mt-4 mb-2 leading-tight">
              {copy.q3.title}
            </h2>
            <p className="text-[13px] text-ink-muted leading-[1.65] mb-5">
              {role.title} {copy.q3.bodyPrefix} — {copy.q3.bodySuffix}
            </p>
            <NotifyMeButton
              slug={role.slug}
              labels={{
                notify: copy.q3.notify,
                notifySubmitting: copy.q3.notifySubmitting,
                notifySuccess: copy.q3.notifySuccess,
                notifyError: copy.q3.notifyError,
              }}
            />

            <div className="mt-7 pt-6 border-t border-rule">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-3">
                {copy.q3.defaults}
              </p>
              <dl className="flex flex-col gap-2 text-[12px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">{copy.q3.suggestedName}</dt>
                  <dd className="text-ink">{config.defaultName}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">{copy.q3.schedule}</dt>
                  <dd className="text-ink text-right max-w-[180px]">
                    {config.defaultSchedule}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">{copy.q3.approvalMode}</dt>
                  <dd className="text-ink">{config.defaultApprovalMode}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">{copy.q3.channels}</dt>
                  <dd className="text-ink text-right">
                    {config.defaultChannels.join(", ")}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          {/* Criteria preview */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {config.specifics.length > 0 ? (
              <Card>
                <SectionTitle
                  label={`${role.title} · ${copy.q3.criteriaSuffix}`}
                  description={copy.q3.criteriaDescription}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 opacity-75 pointer-events-none">
                  {config.specifics.map((f) => (
                    <FieldPreview key={f.key} field={f} />
                  ))}
                </div>
              </Card>
            ) : (
              <Card className="text-center py-10">
                <p className="text-[13px] text-ink-muted">
                  {copy.q3.noPreview}
                </p>
              </Card>
            )}

            <Card>
              <SectionTitle
                label={copy.q3.exampleTasks}
                description={copy.q3.exampleTasksDescription}
              />
              <ul className="flex flex-col gap-2">
                {config.taskExamples.map((ex) => (
                  <li
                    key={ex}
                    className="flex items-start gap-2.5 px-3 py-2 rounded-md border border-rule bg-canvas-soft/40"
                  >
                    <span
                      aria-hidden
                      className="mt-[7px] block size-1 rounded-full bg-ink-soft shrink-0"
                    />
                    <span className="text-[12.5px] text-ink-muted leading-[1.6]">
                      {ex}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={title}
      description={role.summary}
      crumbs={[
        {
          label: copy.crumbs.workforce,
          href: localizePath("/app/workforce", locale),
        },
        {
          label: copy.crumbs.hire,
          href: localizePath("/app/workforce/hire", locale),
        },
        { label: role.title },
      ]}
    >
      <WorkerHireForm
        config={config}
        roleTitle={role.title}
        mode="create"
        cancelHref="/app/workforce/hire"
      />
    </PageShell>
  );
}

function FieldPreview({ field }: { field: RoleSpecificField }) {
  if (field.kind === "number") {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          {field.label}
        </span>
        <div className="flex items-baseline border-b border-rule pb-2 gap-2">
          <span className="text-[14px] text-ink">{field.default}</span>
          {field.unit && (
            <span className="text-[12px] text-ink-soft">{field.unit}</span>
          )}
        </div>
        {field.help && (
          <span className="text-[11.5px] text-ink-soft leading-[1.5]">
            {field.help}
          </span>
        )}
      </div>
    );
  }
  if (field.kind === "select") {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          {field.label}
        </span>
        <div className="border-b border-rule pb-2 text-[14px] text-ink">
          {field.default}
        </div>
        {field.help && (
          <span className="text-[11.5px] text-ink-soft leading-[1.5]">
            {field.help}
          </span>
        )}
      </div>
    );
  }
  if (field.kind === "multiSelect") {
    return (
      <div className="sm:col-span-2 flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          {field.label}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {field.options.map((o) => {
            const on = field.default.includes(o);
            return (
              <span
                key={o}
                className={`inline-flex items-center text-[12px] font-medium px-3 py-1 rounded-full border ${
                  on
                    ? "bg-ink text-white border-ink"
                    : "bg-card text-ink-muted border-rule"
                }`}
              >
                {o}
              </span>
            );
          })}
        </div>
      </div>
    );
  }
  if (field.kind === "textarea") {
    return (
      <div className="sm:col-span-2 flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          {field.label}
        </span>
        <div className="border border-rule rounded-md px-3 py-2 text-[12.5px] text-ink-soft whitespace-pre-line leading-[1.55] bg-canvas-soft/40 min-h-[80px]">
          {field.placeholder || "—"}
        </div>
      </div>
    );
  }
  if (field.kind === "toggle") {
    return (
      <div className="sm:col-span-2 flex items-start justify-between gap-3 p-3 rounded-md border border-rule">
        <div className="flex-1">
          <p className="text-[13px] font-medium text-ink mb-0.5">{field.label}</p>
          {field.help && (
            <p className="text-[11.5px] text-ink-soft leading-[1.5]">
              {field.help}
            </p>
          )}
        </div>
        <span
          className={`relative inline-flex items-center w-9 h-5 rounded-full ${
            field.default ? "bg-ink" : "bg-rule"
          }`}
        >
          <span
            className={`absolute top-0.5 inline-block size-4 rounded-full bg-white shadow ${
              field.default ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </span>
      </div>
    );
  }
  return null;
}
