"use client";

import { useEffect, useState } from "react";
import {
  PageShell,
  Badge,
} from "@/components/app/PageShell";
import { IconClose } from "@/components/Icons";

type IntegrationStatus = "Live" | "Degraded" | "Disabled";

type AdminIntegration = {
  id: string;
  name: string;
  category: "Channel" | "AI provider" | "Payments" | "Email" | "Storage" | "Telemetry";
  status: IntegrationStatus;
  hint: string;
  tenants: number;
};

type ApiIntegration = {
  id: string;
  name: string;
  category: AdminIntegration["category"];
  status: IntegrationStatus;
  hint: string;
  tenantsInstalled: number;
};

const CATEGORIES = ["All", "Channel", "AI provider", "Payments", "Email", "Storage", "Telemetry"] as const;

export default function AdminIntegrationsPage() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const [detail, setDetail] = useState<AdminIntegration | null>(null);
  const [integrations, setIntegrations] = useState<AdminIntegration[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/platform-integrations", {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setLoadError(`HTTP ${res.status}`);
          return;
        }
        const json = (await res.json()) as { integrations: ApiIntegration[] };
        if (!cancelled) {
          setIntegrations(
            json.integrations.map((r) => ({
              id: r.id,
              name: r.name,
              category: r.category,
              status: r.status,
              hint: r.hint,
              tenants: r.tenantsInstalled,
            })),
          );
        }
      } catch {
        if (!cancelled) setLoadError("Network error.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = integrations.filter(
    (i) => cat === "All" || i.category === cat,
  );

  return (
    <PageShell
      title="Platform integrations"
      description="External services Staffbix depends on. Monitor health, rotate keys, disable in incidents."
      actions={
        // Bulk platform-key rotation is operated out-of-band (secrets
        // live in Railway env, not the DB). Per-tenant integration
        // rotation is available on each tenant's detail page. This
        // control is intentionally inert and labelled as such.
        <span
          title="Platform secrets rotate via Railway env vars. Per-tenant credentials rotate on the tenant detail page."
          className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3.5 py-2 rounded-full border border-rule text-ink-soft"
        >
          <span aria-hidden>↻</span>
          Key rotation: managed in Railway
        </span>
      }
    >
      <div className="flex flex-wrap gap-1.5 mb-5">
        {CATEGORIES.map((c) => {
          const active = cat === c;
          const count =
            c === "All"
              ? integrations.length
              : integrations.filter((i) => i.category === c).length;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                active ? "bg-ink text-white border-ink" : "bg-card text-ink-muted border-rule hover:border-ink/30 hover:text-ink"
              }`}
            >
              {c}
              <span className={`font-mono text-[10px] ${active ? "text-white/70" : "text-ink-soft"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {loadError && (
        <div
          role="alert"
          className="mb-4 px-4 py-3 rounded-md border border-[#B91C1C]/40 bg-[#FEF2F2] text-[12.5px] text-[#7F1D1D]"
        >
          Could not load integrations: {loadError}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-rule border border-rule rounded-[12px] overflow-hidden">
        {filtered.map((i) => (
          <article key={i.id} className="bg-card p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="size-9 rounded-md bg-tint/60 border border-rule flex items-center justify-center font-mono text-[10px] font-medium text-ink uppercase">
                {i.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </div>
              {i.status === "Live" && <Badge tone="accent">Live</Badge>}
              {i.status === "Degraded" && (
                <span className="inline-flex items-center font-mono text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded border bg-[#FEF3C7] text-[#92400E] border-[#92400E]/25">
                  Degraded
                </span>
              )}
              {i.status === "Disabled" && <Badge tone="neutral">Disabled</Badge>}
            </div>
            <div>
              <h3 className="text-[14px] font-medium text-ink leading-tight mb-1">{i.name}</h3>
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft mb-2">{i.category}</p>
              <p className="text-[12.5px] text-ink-muted leading-[1.55]">{i.hint}</p>
            </div>
            <div className="mt-auto pt-3 border-t border-rule flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
                {i.tenants > 0 ? `${i.tenants.toLocaleString("en-US")} tenants` : "Platform-only"}
              </span>
              <button
                type="button"
                onClick={() => setDetail(i)}
                className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted hover:text-ink transition-colors"
              >
                Manage
              </button>
            </div>
          </article>
        ))}
      </div>

      {detail && <DetailModal integration={detail} onClose={() => setDetail(null)} />}
    </PageShell>
  );
}

function DetailModal({
  integration,
  onClose,
}: {
  integration: AdminIntegration;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
      />
      <div className="relative bg-card border border-rule rounded-[14px] w-full max-w-[480px] shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)]">
        <header className="px-6 pt-6 pb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-2">
              {integration.category}
            </p>
            <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink">
              {integration.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors"
          >
            <IconClose />
          </button>
        </header>
        <div className="px-6 pb-5 flex flex-col gap-4">
          <p className="text-[13px] text-ink-muted leading-[1.6]">
            {integration.hint}
          </p>
          <dl className="flex flex-col divide-y divide-rule">
            <Row k="Status" v={integration.status} />
            <Row
              k="Tenants"
              v={
                integration.tenants > 0
                  ? integration.tenants.toLocaleString("en-US")
                  : "Platform-only"
              }
            />
            <Row k="ID" v={integration.id} mono />
          </dl>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
            Status + hint are editable via{" "}
            <code>PATCH /api/admin/platform-integrations/{integration.id}</code>.
            Metrics and key rotation surface on the per-tenant detail page.
          </p>
        </div>
        <footer className="px-6 py-4 border-t border-rule bg-canvas-soft/60 rounded-b-[14px] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

function Row({
  k,
  v,
  mono,
}: {
  k: string;
  v: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
        {k}
      </dt>
      <dd
        className={`text-[12.5px] text-ink text-right ${mono ? "font-mono text-[11.5px]" : ""}`}
      >
        {v}
      </dd>
    </div>
  );
}
