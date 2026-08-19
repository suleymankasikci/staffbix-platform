"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/app/PageShell";
import {
  PlanLimitBanner,
  planLimitTone,
} from "@/components/app/PlanLimitBanner";
import { IconSearch, IconArrowRight } from "@/components/Icons";
import { useLocale, useLocalizedPath } from "@/lib/i18n/client";
import { getAppWorkforceHireCatalogCopy } from "@/lib/i18n/page-copy";
import { CATEGORIES, type Category, type Role } from "@/lib/roles";

interface WorkerUsage {
  current: number;
  limit: number;
}

export default function HirePage() {
  const locale = useLocale();
  const localize = useLocalizedPath();
  const copy = getAppWorkforceHireCatalogCopy(locale);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Category>("All");
  const [showQ3, setShowQ3] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [workerUsage, setWorkerUsage] = useState<WorkerUsage | null>(null);
  const workerTone = workerUsage
    ? planLimitTone(workerUsage.current, workerUsage.limit)
    : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/catalog-roles", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setLoadError(`Catalog unavailable (HTTP ${res.status}).`);
          return;
        }
        const json = (await res.json()) as { roles: Role[] };
        if (!cancelled) setRoles(json.roles);
      } catch {
        if (!cancelled) setLoadError("Catalog unavailable.");
      }
    })();

    // Pull current worker usage so the page can warn / block when the
    // tenant is at or near `plan.maxWorkers`. Silent on failure.
    (async () => {
      try {
        const res = await fetch("/api/billing/me", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          usage?: { workers?: { current: number; limit: number } };
        };
        if (!cancelled && json.usage?.workers) {
          setWorkerUsage(json.usage.workers);
        }
      } catch {
        // banner just won't appear
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return roles
      .filter((r) => {
        if (active !== "All" && r.category !== active) return false;
        if (!showQ3 && r.status === "q3") return false;
        if (q) {
          const needle = q.toLowerCase();
          if (
            !r.title.toLowerCase().includes(needle) &&
            !r.summary.toLowerCase().includes(needle)
          )
            return false;
        }
        return true;
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [roles, q, active, showQ3]);

  return (
    <PageShell
      title={copy.title}
      description={copy.description}
      crumbs={[
        { label: copy.crumbs.workforce, href: localize("/app/workforce") },
        { label: copy.crumbs.hire },
      ]}
    >
      {workerUsage && workerTone && (
        <PlanLimitBanner
          tone={workerTone}
          title={
            workerTone === "block"
              ? copy.planLimit.blockTitle
              : copy.planLimit.warnTitle
          }
          body={
            workerTone === "block"
              ? copy.planLimit.blockBody
              : copy.planLimit.warnBody
          }
          hint={copy.planLimit.hint
            .replace("{current}", String(workerUsage.current))
            .replace("{limit}", String(workerUsage.limit))}
          cta={copy.planLimit.cta}
        />
      )}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const isActive = active === c;
            const count =
              c === "All"
                ? roles.length
                : roles.filter((r) => r.category === c).length;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActive(c)}
                className={`inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  isActive
                    ? "bg-ink text-white border-ink"
                    : "bg-card text-ink-muted border-rule hover:border-ink/30 hover:text-ink"
                }`}
              >
                {copy.categories[c]}
                <span
                  className={`font-mono text-[10px] ${
                    isActive ? "text-white/70" : "text-ink-soft"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-4">
          {roles.some((r) => r.status === "q3") && (
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                {copy.showRoadmap}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={showQ3}
                onClick={() => setShowQ3((v) => !v)}
                className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors ${
                  showQ3 ? "bg-ink" : "bg-rule"
                }`}
              >
                <span
                  className={`absolute top-0.5 inline-block size-4 rounded-full bg-white shadow transition-transform ${
                    showQ3 ? "translate-x-[18px]" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>
          )}
          <div className="inline-flex items-center gap-2 border border-rule rounded-md px-3 h-9 bg-card min-w-[240px]">
            <IconSearch className="text-ink-soft shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={copy.searchPlaceholder}
              className="flex-1 bg-transparent text-[12.5px] text-ink placeholder:text-ink-soft border-0 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft mb-5">
        {filtered.length}{" "}
        {filtered.length === 1 ? copy.roleSingular : copy.rolePlural}
        {active !== "All" && (
          <>
            <span className="text-ink-soft/60 mx-2">·</span>
            {copy.categories[active]}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-rule border border-rule rounded-[12px] overflow-hidden">
        {filtered.map((r) => (
          <CatalogCard
            key={r.slug}
            role={r}
            copy={{
              available: copy.available,
              comingQ3: copy.comingQ3,
              hireAsEmployee: copy.hireAsEmployee,
              notifyWhenAvailable: copy.notifyWhenAvailable,
              categories: copy.categories,
            }}
            localize={localize}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-[14px] text-ink-muted">
          {loadError ?? copy.noMatches}
        </div>
      )}
    </PageShell>
  );
}

function CatalogCard({
  role,
  copy,
  localize,
}: {
  role: Role;
  copy: {
    available: string;
    comingQ3: string;
    hireAsEmployee: string;
    notifyWhenAvailable: string;
    categories: Record<string, string>;
  };
  localize: (href: string) => string;
}) {
  const isAvailable = role.status === "available";
  return (
    <article className="group bg-card p-5 flex flex-col gap-3 transition-colors hover:bg-canvas-soft">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
          {copy.categories[role.category] ?? role.category}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] ${
            isAvailable ? "text-accent" : "text-ink-soft"
          }`}
        >
          <span
            className={`size-[5px] rounded-full ${
              isAvailable ? "bg-accent" : "bg-ink-soft"
            }`}
          />
          {isAvailable ? copy.available : copy.comingQ3}
        </span>
      </div>

      <h3 className="text-[15px] font-medium tracking-[-0.01em] text-ink leading-[1.25]">
        {role.title}
      </h3>

      <p className="text-[12.5px] text-ink-muted leading-[1.6] flex-1">
        {role.summary}
      </p>

      <div className="flex flex-wrap gap-1 pt-1">
        {role.channels.slice(0, 4).map((ch) => (
          <span
            key={ch}
            className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted bg-canvas-soft border border-rule rounded px-1.5 py-0.5"
          >
            {ch}
          </span>
        ))}
      </div>

      <div className="pt-3 border-t border-rule">
        {isAvailable ? (
          <Link
            href={localize(`/app/workforce/hire/${role.slug}`)}
            className="inline-flex items-center justify-between w-full text-[12px] font-medium text-ink hover:text-ink-muted transition-colors"
          >
            <span>{copy.hireAsEmployee}</span>
            <IconArrowRight
              width={13}
              height={13}
              className="text-ink-soft group-hover:text-ink transition-colors"
            />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex items-center w-full text-[12px] text-ink-soft cursor-not-allowed"
          >
            {copy.notifyWhenAvailable}
          </button>
        )}
      </div>
    </article>
  );
}
