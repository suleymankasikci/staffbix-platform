"use client";

import { useEffect, useState } from "react";
import {
  PageShell,
  Badge,
} from "@/components/app/PageShell";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import { IconPlus, IconEdit, IconTrash, IconClose } from "@/components/Icons";

interface ApiPlan {
  id: string;
  name: string;
  tagline: string;
  stripePriceId: string | null;
  priceMonthlyCents: number;
  currency: string;
  maxWorkers: number;
  maxMonthlyAiDollars: number;
  maxChannelsPerWorker: number;
  maxTeamSeats: number;
  features: unknown;
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface PlanFormState {
  name: string;
  tagline: string;
  priceMonthly: string;
  maxWorkers: string;
  maxTeamSeats: string;
  maxChannelsPerWorker: string;
  isPublic: boolean;
}

function featureList(features: unknown): string[] {
  if (Array.isArray(features)) {
    return features.filter((f): f is string => typeof f === "string");
  }
  if (features && typeof features === "object") {
    return Object.entries(features as Record<string, unknown>)
      .filter(([, v]) => v === true || (typeof v === "string" && v.length > 0))
      .map(([k, v]) => (typeof v === "string" ? v : k));
  }
  return [];
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ApiPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [archiveId, setArchiveId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/plans", { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as {
          plans?: ApiPlan[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(body.error ?? "Couldn't load plans.");
          return;
        }
        setPlans(body.plans ?? []);
      } catch {
        if (!cancelled) setLoadError("Network error loading plans.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const target = archiveId ? plans.find((p) => p.id === archiveId) : null;
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  async function doArchive() {
    if (!archiveId) return;
    setArchiveBusy(true);
    setArchiveError(null);
    try {
      const res = await fetch(`/api/admin/plans/${encodeURIComponent(archiveId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isPublic: false }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setArchiveError(json.error ?? `Archive failed (HTTP ${res.status}).`);
        return;
      }
      setPlans((ps) =>
        ps.map((p) => (p.id === archiveId ? { ...p, isPublic: false } : p)),
      );
      setArchiveId(null);
    } catch {
      setArchiveError("Network error.");
    } finally {
      setArchiveBusy(false);
    }
  }

  const visiblePlans = plans;
  const activeCount = visiblePlans.filter((p) => p.isPublic).length;

  return (
    <PageShell
      title="Plans"
      description="Pricing tiers exposed to customers. Changes apply to new subscriptions only — existing subscriptions keep their current terms until renewal."
      actions={
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
        >
          <IconPlus width={13} height={13} />
          New plan
        </button>
      }
    >
      {loadError && (
        <div className="mb-5 text-[13px] text-[#B91C1C] bg-[#FEE2E2] border border-[#B91C1C]/25 rounded-md px-3 py-2">
          {loadError}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-rule rounded-[12px] border border-rule overflow-hidden mb-6">
        <Stat
          label="Active plans"
          value={loading ? "—" : String(activeCount)}
        />
        <Stat label="Total plans" value={loading ? "—" : String(plans.length)} />
        <Stat
          label="Cheapest"
          value={
            plans.length === 0
              ? "—"
              : `$${(
                  Math.min(
                    ...plans
                      .filter((p) => p.priceMonthlyCents > 0)
                      .map((p) => p.priceMonthlyCents),
                  ) / 100
                ).toLocaleString("en-US")}`
          }
        />
        <Stat
          label="Premium"
          value={
            plans.length === 0
              ? "—"
              : `$${(
                  Math.max(...plans.map((p) => p.priceMonthlyCents)) / 100
                ).toLocaleString("en-US")}`
          }
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-rule border border-rule rounded-[12px] overflow-hidden">
        {visiblePlans.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            onEdit={() => setEditing(p)}
            onArchive={() => setArchiveId(p.id)}
          />
        ))}
        {!loading && visiblePlans.length === 0 && (
          <div className="col-span-full bg-card p-10 text-center text-[13px] text-ink-muted">
            No plans configured yet.
          </div>
        )}
      </div>

      {creating && (
        <PlanFormModal
          mode="create"
          onClose={() => setCreating(false)}
          onSave={() => {
            // Plan creation requires a corresponding Stripe price ID
            // (created out-of-band via the Stripe dashboard or CLI) so
            // the create-from-admin flow is staffed deliberately: the
            // platform admin generates a price in Stripe, then seeds
            // the row via the deploy script. Surfacing that here keeps
            // the UI honest rather than alerting.
            setLoadError(
              "Plan creation requires a Stripe price ID — provision via the deploy script after creating the price in Stripe.",
            );
            setCreating(false);
          }}
        />
      )}

      {editing && (
        <PlanFormModal
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (next) => {
            try {
              const res = await fetch(
                `/api/admin/plans/${encodeURIComponent(editing.id)}`,
                {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    name: next.name,
                    tagline: next.tagline,
                    isPublic: next.isPublic,
                    // Numeric caps: -1 stays as "unlimited" sentinel; parse digits.
                    maxWorkers:
                      next.maxWorkers === "Unlimited"
                        ? -1
                        : Number(next.maxWorkers) || 0,
                    maxTeamSeats:
                      next.maxTeamSeats === "Unlimited"
                        ? -1
                        : Number(next.maxTeamSeats) || 0,
                    maxChannelsPerWorker: Number(next.maxChannelsPerWorker) || 0,
                  }),
                },
              );
              const json = (await res.json().catch(() => ({}))) as {
                ok?: boolean;
                error?: string;
              };
              if (!res.ok || !json.ok) {
                setLoadError(json.error ?? `Save failed (HTTP ${res.status}).`);
                return;
              }
              // Optimistically reflect the change.
              setPlans((ps) =>
                ps.map((p) =>
                  p.id === editing.id
                    ? {
                        ...p,
                        name: next.name,
                        tagline: next.tagline,
                        isPublic: next.isPublic,
                        maxWorkers:
                          next.maxWorkers === "Unlimited"
                            ? -1
                            : Number(next.maxWorkers) || 0,
                        maxTeamSeats:
                          next.maxTeamSeats === "Unlimited"
                            ? -1
                            : Number(next.maxTeamSeats) || 0,
                        maxChannelsPerWorker:
                          Number(next.maxChannelsPerWorker) || 0,
                      }
                    : p,
                ),
              );
              setEditing(null);
            } catch {
              setLoadError("Network error while saving.");
            }
          }}
        />
      )}

      <ConfirmModal
        open={Boolean(archiveId)}
        onClose={() => {
          setArchiveId(null);
          setArchiveError(null);
        }}
        onConfirm={doArchive}
        title={`Archive "${target?.name}"?`}
        confirmLabel={archiveBusy ? "Archiving…" : "Archive plan"}
        tone="danger"
        body={
          <>
            <p>
              No new customers can subscribe. Existing subscribers keep
              their current terms until renewal — at which point they&apos;ll
              need to switch plans manually.
            </p>
            {archiveError && (
              <p className="mt-3 text-[12px] text-[#B91C1C]" role="alert">
                {archiveError}
              </p>
            )}
          </>
        }
      />
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-2">
        {label}
      </p>
      <p className="text-[22px] font-medium tracking-[-0.02em] text-ink leading-none tabular-nums">
        {value}
      </p>
    </div>
  );
}

function PlanCard({
  plan,
  onEdit,
  onArchive,
}: {
  plan: ApiPlan;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const features = featureList(plan.features);
  const priceMonthly = plan.priceMonthlyCents / 100;
  return (
    <article className="bg-card p-6 flex flex-col gap-4 h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-1">
            {plan.name}
          </p>
          <p className="text-[26px] font-medium tracking-[-0.025em] text-ink leading-none">
            {priceMonthly === 0 ? "Custom" : `$${priceMonthly}`}
          </p>
          {priceMonthly > 0 && (
            <p className="text-[11.5px] text-ink-muted mt-1">
              per month · {plan.currency.toUpperCase()}
            </p>
          )}
          {plan.tagline && (
            <p className="text-[11.5px] text-ink-muted mt-1 line-clamp-2">
              {plan.tagline}
            </p>
          )}
        </div>
        <Badge tone={plan.isPublic ? "accent" : "neutral"}>
          {plan.isPublic ? "Active" : "Archived"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 py-3 border-y border-rule">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-1">
            Plan id
          </p>
          <p className="font-mono text-[12px] font-medium text-ink truncate">
            {plan.id}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-1">
            Stripe
          </p>
          <p className="font-mono text-[11px] font-medium text-ink truncate">
            {plan.stripePriceId ?? "—"}
          </p>
        </div>
      </div>

      <div className="flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-2">
          Limits
        </p>
        <dl className="flex flex-col gap-1.5 text-[12px]">
          <div className="flex justify-between gap-2">
            <dt className="text-ink-muted">Workers</dt>
            <dd className="text-ink">
              {plan.maxWorkers === -1 ? "Unlimited" : plan.maxWorkers}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-muted">AI budget / mo</dt>
            <dd className="text-ink tabular-nums">
              {plan.maxMonthlyAiDollars === -1
                ? "Unlimited"
                : `$${plan.maxMonthlyAiDollars}`}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-muted">Team seats</dt>
            <dd className="text-ink tabular-nums">
              {plan.maxTeamSeats === -1 ? "Unlimited" : plan.maxTeamSeats}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-muted">Channels / worker</dt>
            <dd className="text-ink tabular-nums">{plan.maxChannelsPerWorker}</dd>
          </div>
        </dl>
        {features.length > 0 && (
          <>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mt-4 mb-2">
              Features ({features.length})
            </p>
            <ul className="text-[12px] text-ink-muted leading-[1.6] flex flex-col gap-0.5">
              {features.slice(0, 4).map((f) => (
                <li key={f} className="truncate">
                  · {f}
                </li>
              ))}
              {features.length > 4 && (
                <li className="text-ink-soft">
                  + {features.length - 4} more
                </li>
              )}
            </ul>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-rule">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-md border border-rule text-ink hover:border-ink/30 transition-colors"
        >
          <IconEdit width={12} height={12} />
          Edit
        </button>
        <button
          type="button"
          onClick={onArchive}
          disabled={!plan.isPublic}
          className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-[#B91C1C] hover:bg-canvas-soft disabled:opacity-40 transition-colors"
          aria-label="Archive"
        >
          <IconTrash width={13} height={13} />
        </button>
      </div>
    </article>
  );
}

function PlanFormModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  initial?: ApiPlan;
  onClose: () => void;
  onSave: (plan: PlanFormState) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [tagline, setTagline] = useState(initial?.tagline ?? "");
  const [monthly, setMonthly] = useState(
    initial ? String(initial.priceMonthlyCents / 100) : "0",
  );
  const [workers, setWorkers] = useState(
    initial
      ? initial.maxWorkers === -1
        ? "Unlimited"
        : String(initial.maxWorkers)
      : "1",
  );
  const [seats, setSeats] = useState(
    initial
      ? initial.maxTeamSeats === -1
        ? "Unlimited"
        : String(initial.maxTeamSeats)
      : "5",
  );
  const [channels, setChannels] = useState(
    initial ? String(initial.maxChannelsPerWorker) : "2",
  );
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? true);

  function submit() {
    if (!name) return;
    onSave({
      name,
      tagline,
      priceMonthly: monthly,
      maxWorkers: workers,
      maxTeamSeats: seats,
      maxChannelsPerWorker: channels,
      isPublic,
    });
  }

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
      <div className="relative bg-card border border-rule rounded-[14px] w-full max-w-[560px] shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)] max-h-[90vh] overflow-y-auto">
        <header className="px-6 pt-6 pb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-2">
              {mode === "create" ? "New plan" : `Edit ${initial?.name}`}
            </p>
            <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink">
              {mode === "create"
                ? "Define a new pricing tier."
                : "Update plan details."}
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

        <div className="px-6 pb-5 grid grid-cols-2 gap-4">
          <Field
            label="Plan name"
            value={name}
            onChange={setName}
            className="col-span-2"
          />
          <Field
            label="Tagline"
            value={tagline}
            onChange={setTagline}
            className="col-span-2"
          />
          <Field
            label="Monthly price (USD)"
            value={monthly}
            onChange={setMonthly}
          />
          <Field
            label="Worker limit"
            value={workers}
            onChange={setWorkers}
            hint="Use 'Unlimited' for Enterprise"
          />
          <Field label="Team seats" value={seats} onChange={setSeats} />
          <Field
            label="Channels / worker"
            value={channels}
            onChange={setChannels}
          />
          <label className="col-span-2 flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
              Visibility
            </span>
            <div className="flex gap-2">
              {([true, false] as const).map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setIsPublic(v)}
                  className={`flex-1 px-3 py-2 rounded-md border text-[12.5px] font-medium transition-colors ${
                    isPublic === v
                      ? "border-ink bg-ink text-white"
                      : "border-rule bg-card text-ink-muted hover:border-ink/25 hover:text-ink"
                  }`}
                >
                  {v ? "Public" : "Archived"}
                </button>
              ))}
            </div>
          </label>
        </div>

        <footer className="px-6 py-4 border-t border-rule bg-canvas-soft/60 rounded-b-[14px] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
          >
            {mode === "create" ? "Create plan" : "Save changes"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors"
      />
      {hint && <span className="text-[11.5px] text-ink-soft">{hint}</span>}
    </label>
  );
}
