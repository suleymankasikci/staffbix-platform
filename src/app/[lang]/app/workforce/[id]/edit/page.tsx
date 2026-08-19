"use client";

import { use, useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { PageShell } from "@/components/app/PageShell";
import { WorkerHireForm } from "@/components/app/WorkerHireForm";
import { type HiredWorker } from "@/lib/hired-workers";
import { useLocale, useLocalizedPath } from "@/lib/i18n/client";
import { getAppWorkerEditorCopy } from "@/lib/i18n/page-copy";
import { getRoleConfig } from "@/lib/role-configs";
import type { Role } from "@/lib/roles";

export default function EditWorkerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = useLocale();
  const localize = useLocalizedPath();
  const copy = getAppWorkerEditorCopy(locale);
  const { id } = use(params);
  const router = useRouter();
  const [worker, setWorker] = useState<HiredWorker | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundFlag, setNotFoundFlag] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/workers/${id}?shape=ui`, { cache: "no-store" });
        if (res.status === 404) {
          if (!cancelled) setNotFoundFlag(true);
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as { worker: HiredWorker };
        if (cancelled) return;
        setWorker(data.worker);
        // Fetch the catalog role for this worker so we can build the
        // hire-form config. Public endpoint — no auth needed.
        const roleRes = await fetch(
          `/api/catalog-roles/${encodeURIComponent(data.worker.roleSlug)}`,
          { cache: "no-store" },
        );
        if (roleRes.status === 404) {
          if (!cancelled) setNotFoundFlag(true);
          return;
        }
        if (!roleRes.ok) return;
        const roleJson = (await roleRes.json()) as { role: Role };
        if (!cancelled) setRole(roleJson.role);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleTerminate() {
    if (!worker) return;
    const res = await fetch(`/api/workers/${worker.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "terminated" }),
    });
    if (res.ok) router.push(localize("/app/workforce"));
  }

  if (notFoundFlag) notFound();
  if (loading || !worker || !role) {
    return (
      <PageShell
        title={copy.crumbs.edit}
        crumbs={[
          { label: copy.crumbs.workforce, href: localize("/app/workforce") },
          { label: copy.crumbs.edit },
        ]}
      >
        <p className="text-[13px] text-ink-muted">…</p>
      </PageShell>
    );
  }

  const config = getRoleConfig(role);

  return (
    <PageShell
      title={`${copy.titlePrefix} ${worker.name}`}
      description={`${worker.role} · ${copy.hiredPrefix} ${worker.hiredOn}`}
      crumbs={[
        { label: copy.crumbs.workforce, href: localize("/app/workforce") },
        { label: worker.name, href: localize(`/app/workforce/${worker.id}`) },
        { label: copy.crumbs.edit },
      ]}
    >
      <WorkerHireForm
        config={config}
        roleTitle={worker.role}
        mode="edit"
        initial={worker}
        cancelHref={`/app/workforce/${worker.id}`}
        onTerminate={() => void handleTerminate()}
      />
    </PageShell>
  );
}
