"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, type Category, type Role } from "@/lib/roles";
import { useLocale } from "@/lib/i18n/client";
import { getWorkforcePageCopy } from "@/lib/i18n/page-copy";

export function WorkforceCatalog() {
  const locale = useLocale();
  const copy = getWorkforcePageCopy(locale).catalog;
  const [active, setActive] = useState<Category>("All");
  const [showQ3, setShowQ3] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

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
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return roles
      .filter((r) => {
        if (active !== "All" && r.category !== active) return false;
        if (!showQ3 && r.status === "q3") return false;
        return true;
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [roles, active, showQ3]);

  const counts = useMemo(() => {
    return CATEGORIES.reduce<Record<string, number>>((acc, c) => {
      acc[c] =
        c === "All" ? roles.length : roles.filter((r) => r.category === c).length;
      return acc;
    }, {});
  }, [roles]);

  return (
    <section className="py-14 md:py-20">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        {/* Filter bar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-10 md:mb-12">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const isActive = active === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActive(c)}
                  className={`inline-flex items-center gap-2 text-[12.5px] font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
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
                    {counts[c]}
                  </span>
                </button>
              );
            })}
          </div>

          {roles.some((r) => r.status === "q3") && (
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
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
        </div>

        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft mb-6">
          {filtered.length}{" "}
          {filtered.length === 1 ? copy.roleSingular : copy.rolePlural}
          {active !== "All" && (
            <>
              <span className="text-ink-soft/60 mx-2">·</span>
              {copy.categories[active]}
            </>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-rule border border-rule rounded-[14px] overflow-hidden">
          {filtered.map((r) => (
            <RoleCard
              key={r.slug}
              role={r}
              category={copy.categories[r.category as Category]}
              availableLabel={copy.available}
              comingLabel={copy.coming}
              hireAsLabel={copy.hireAs}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-[14px] text-ink-muted">
            {loadError ?? copy.noMatches}
          </div>
        )}
      </div>
    </section>
  );
}

function RoleCard({
  role,
  category,
  availableLabel,
  comingLabel,
  hireAsLabel,
}: {
  role: Role;
  category: string;
  availableLabel: string;
  comingLabel: string;
  hireAsLabel: string;
}) {
  const isAvailable = role.status === "available";
  return (
    <article className="group h-full bg-card p-6 flex flex-col gap-3 transition-colors hover:bg-canvas-soft">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
          {category}
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
          {isAvailable ? availableLabel : comingLabel}
        </span>
      </div>

      <h3 className="text-[18px] font-medium tracking-[-0.015em] text-ink leading-[1.2] mt-1">
        {role.title}
      </h3>

      <p className="text-[13px] text-ink-muted leading-[1.6] flex-1">
        {role.summary}
      </p>

      <div className="flex flex-wrap gap-1.5 pt-2">
        {role.channels.map((ch) => (
          <span
            key={ch}
            className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted bg-canvas-soft border border-rule rounded-md px-1.5 py-0.5"
          >
            {ch}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-rule">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
          {hireAsLabel}
        </span>
        <span
          aria-hidden
          className="text-ink-muted group-hover:text-ink transition-colors text-[13px]"
        >
          →
        </span>
      </div>
    </article>
  );
}
