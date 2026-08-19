"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell, Badge } from "@/components/app/PageShell";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import { IconArrowRight, IconCheck } from "@/components/Icons";
import { useLocale } from "@/lib/i18n/client";
import { getAppIntegrationsCopy } from "@/lib/i18n/page-copy";

type Integration = {
  id: string;
  displayName: string;
  categoryKey: Exclude<CategoryKey, "all">;
  detail: string;
  status: "connected" | "available" | "actionRequired";
  lastSync?: string;
};

const CATEGORIES = ["all", "channels", "ecommerce", "calendarStorage", "finance", "analytics"] as const;
type CategoryKey = (typeof CATEGORIES)[number];

type ApiIntegration = {
  id: string;
  kind: "whatsapp" | "email_smtp" | "instagram" | "twitter" | "linkedin";
  status: "active" | "paused" | "broken" | "disconnected";
  displayName: string;
  externalId: string | null;
  metadata: Record<string, unknown>;
  lastVerifiedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

const KIND_CATEGORY: Record<ApiIntegration["kind"], Exclude<CategoryKey, "all">> = {
  whatsapp: "channels",
  email_smtp: "channels",
  instagram: "channels",
  twitter: "channels",
  linkedin: "channels",
};

const KIND_DETAIL: Record<ApiIntegration["kind"], string> = {
  whatsapp: "Cloud API or BSP. Template messages, conversation windows.",
  email_smtp:
    "Outbound SMTP transport with optional TLS. Per-tenant sender identity.",
  instagram: "DMs, comments, publishing through the Graph API.",
  twitter: "Publish approved posts to X (Twitter) via the API.",
  linkedin: "Publish approved posts to LinkedIn via the API.",
};

function mapStatus(s: ApiIntegration["status"]): Integration["status"] {
  if (s === "active") return "connected";
  if (s === "broken") return "actionRequired";
  // paused / disconnected → "available" so the user can re-connect.
  return "available";
}

function formatLastSync(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  const diffH = (Date.now() - d.getTime()) / 3600_000;
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${Math.round(diffH)}h ago`;
  return `${Math.round(diffH / 24)}d ago`;
}

function fromApi(row: ApiIntegration): Integration {
  const status = mapStatus(row.status);
  return {
    id: row.id,
    displayName: row.displayName,
    categoryKey: KIND_CATEGORY[row.kind] ?? "channels",
    detail: KIND_DETAIL[row.kind] ?? "",
    status,
    lastSync:
      status === "connected"
        ? formatLastSync(row.lastVerifiedAt) ?? "Real-time"
        : status === "actionRequired"
          ? "Awaiting access"
          : undefined,
  };
}

export default function IntegrationsPage() {
  const locale = useLocale();
  const copy = getAppIntegrationsCopy(locale);
  const [active, setActive] = useState<CategoryKey>("all");
  const [disconnectId, setDisconnectId] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [social, setSocial] = useState<{
    twitter: ApiIntegration | null;
    linkedin: ApiIntegration | null;
  }>({ twitter: null, linkedin: null });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null,
  );

  // Reflect the OAuth callback's ?connected= / ?error= result, then
  // strip the params so a refresh doesn't re-show the banner.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const connected = sp.get("connected");
    const error = sp.get("error");
    if (connected) {
      setBanner({ kind: "ok", text: copy.social.connectedBanner });
    } else if (error) {
      setBanner({
        kind: "error",
        text:
          error === "unconfigured"
            ? copy.social.errorUnconfigured
            : copy.social.errorBanner,
      });
    }
    if (connected || error) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [copy.social]);

  async function loadIntegrations() {
    try {
      const res = await fetch("/api/integrations", { cache: "no-store" });
      if (!res.ok) {
        setLoadError(`Failed to load integrations (HTTP ${res.status}).`);
        return;
      }
      const body = (await res.json()) as { integrations: ApiIntegration[] };
      const rows = body.integrations ?? [];
      setIntegrations(rows.map(fromApi));
      const activeOf = (kind: ApiIntegration["kind"]) =>
        rows.find((r) => r.kind === kind && r.status === "active") ?? null;
      setSocial({ twitter: activeOf("twitter"), linkedin: activeOf("linkedin") });
      setLoadError(null);
    } catch {
      setLoadError("Network error loading integrations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadIntegrations();
  }, []);

  function connectSocial(provider: "twitter" | "linkedin") {
    // Full-page navigation into the OAuth flow. lang lets the callback
    // return to the right locale.
    window.location.href = `/api/integrations/social/${provider}/connect?lang=${locale}`;
  }

  const filtered = useMemo(
    () =>
      integrations.filter(
        (i) => active === "all" || i.categoryKey === active,
      ),
    [integrations, active],
  );
  const target = disconnectId
    ? integrations.find((i) => i.id === disconnectId)
    : null;

  const connectedCount = integrations.filter(
    (i) => i.status === "connected",
  ).length;

  return (
    <PageShell
      title={copy.title}
      description={copy.description}
      actions={
        <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          <span className="size-1.5 rounded-full bg-accent" />
          {connectedCount} {copy.connected}
        </span>
      }
    >
      {banner && (
        <div
          role={banner.kind === "error" ? "alert" : "status"}
          className={`mb-5 px-4 py-3 rounded-md border text-[12.5px] ${
            banner.kind === "ok"
              ? "border-[#15803D]/25 bg-[#DCFCE7] text-[#14532D]"
              : "border-[#B91C1C]/25 bg-[#FEE2E2] text-[#7F1D1D]"
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Social publishing — real OAuth connect for X + LinkedIn. */}
      <div className="mb-6 rounded-[12px] border border-rule overflow-hidden">
        <div className="px-5 py-4 border-b border-rule">
          <h2 className="text-[14px] font-medium text-ink">
            {copy.social.title}
          </h2>
          <p className="text-[12.5px] text-ink-muted mt-1 leading-[1.55]">
            {copy.social.description}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-rule">
          <SocialConnectRow
            label="X (Twitter)"
            connectLabel={copy.social.connectX}
            reconnectLabel={copy.social.reconnect}
            connectedLabel={copy.social.connectedAs}
            connected={social.twitter}
            onConnect={() => connectSocial("twitter")}
          />
          <SocialConnectRow
            label="LinkedIn"
            connectLabel={copy.social.connectLinkedIn}
            reconnectLabel={copy.social.reconnect}
            connectedLabel={copy.social.connectedAs}
            connected={social.linkedin}
            onConnect={() => connectSocial("linkedin")}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {CATEGORIES.map((c) => {
          const isActive = active === c;
          const count =
            c === "all"
              ? integrations.length
              : integrations.filter((i) => i.categoryKey === c).length;
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-rule border border-rule rounded-[12px] overflow-hidden">
        {filtered.map((i) => (
          <IntegrationCard
            key={i.id}
            integration={i}
            copy={copy}
            onDisconnect={() => setDisconnectId(i.id)}
          />
        ))}
      </div>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
        {loading ? "…" : loadError ?? ""}
      </p>

      <ConfirmModal
        open={Boolean(disconnectId)}
        onClose={() => setDisconnectId(null)}
        onConfirm={() => setDisconnectId(null)}
        title={`${copy.modal.titlePrefix} ${target?.displayName}${copy.modal.titleSuffix}`}
        confirmLabel={copy.actions.disconnect}
        tone="danger"
        body={
          <>
            <p>
              {copy.modal.bodyPrefix} {target?.displayName} {copy.modal.bodySuffix}
            </p>
          </>
        }
      />
    </PageShell>
  );
}

function SocialConnectRow({
  label,
  connectLabel,
  reconnectLabel,
  connectedLabel,
  connected,
  onConnect,
}: {
  label: string;
  connectLabel: string;
  reconnectLabel: string;
  connectedLabel: string;
  connected: ApiIntegration | null;
  onConnect: () => void;
}) {
  const isConnected = Boolean(connected);
  return (
    <div className="bg-card p-5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-ink">{label}</p>
        <p className="text-[12px] text-ink-soft mt-0.5 truncate">
          {isConnected
            ? `${connectedLabel} · ${connected?.displayName ?? ""}`
            : "—"}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isConnected && <Badge tone="accent">{connectedLabel}</Badge>}
        <button
          type="button"
          onClick={onConnect}
          className="inline-flex items-center gap-1 text-[12px] font-medium px-3 py-1.5 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
        >
          {isConnected ? reconnectLabel : connectLabel}
        </button>
      </div>
    </div>
  );
}

function IntegrationCard({
  integration,
  copy,
  onDisconnect,
}: {
  integration: Integration;
  copy: ReturnType<typeof getAppIntegrationsCopy>;
  onDisconnect: () => void;
}) {
  const i = integration;
  const isConnected = i.status === "connected";
  const needsAction = i.status === "actionRequired";

  let action = (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ink hover:text-ink-muted transition-colors"
    >
      <IconCheck width={12} height={12} />
      {copy.actions.connect}
    </button>
  );

  if (isConnected) {
    action = (
      <button
        type="button"
        onClick={onDisconnect}
        className="text-[11.5px] font-medium text-[#B91C1C] hover:text-[#991B1B] transition-colors"
      >
        {copy.actions.disconnect}
      </button>
    );
  }

  if (needsAction) {
    action = (
      <button
        type="button"
        className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ink hover:text-ink-muted transition-colors"
      >
        {copy.actions.fixAccess}
        <IconArrowRight width={12} height={12} />
      </button>
    );
  }

  return (
    <article className="bg-card p-5 flex flex-col gap-3 transition-colors hover:bg-canvas-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="size-9 rounded-md bg-tint/60 border border-rule flex items-center justify-center font-mono text-[10px] font-medium text-ink uppercase tracking-tight">
          {i.displayName
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")}
        </div>
        {isConnected && <Badge tone="accent">{copy.status.connected}</Badge>}
        {needsAction && <Badge tone="ink">{copy.status.actionRequired}</Badge>}
      </div>

      <div>
        <h3 className="text-[14px] font-medium text-ink leading-tight mb-1">
          {i.displayName}
        </h3>
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft mb-2">
          {copy.categories[i.categoryKey]}
        </p>
        <p className="text-[12.5px] text-ink-muted leading-[1.55]">{i.detail}</p>
      </div>

      <div className="mt-auto pt-3 border-t border-rule flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
          {i.lastSync ?? copy.status.notConnected}
        </span>
        {action}
      </div>
    </article>
  );
}
