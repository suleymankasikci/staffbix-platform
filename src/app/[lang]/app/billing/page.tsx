"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PageShell,
  Card,
  SectionTitle,
  Badge,
} from "@/components/app/PageShell";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import { IconArrowRight, IconCheck, IconClose } from "@/components/Icons";
import { useLocale } from "@/lib/i18n/client";
import { getAppBillingCopy } from "@/lib/i18n/page-copy";
import { localizePath } from "@/lib/i18n/routing";

type BillingCopy = ReturnType<typeof getAppBillingCopy>;
type Plan = BillingCopy["plans"][number];
type PlanId = Plan["id"];
type BillingCycle = "monthly" | "annual";

type ApiInvoice = {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
  issuedAt: string | null;
  paidAt: string | null;
};

type BillingData = {
  tenant: {
    id: string;
    planId: string;
    status: string;
    trialEndsAt: string | null;
  };
  plan: {
    id: string;
    name: string;
    tagline: string;
    priceMonthlyCents: number;
    currency: string;
    maxWorkers: number;
    maxMonthlyAiDollars: number;
    maxChannelsPerWorker: number;
    maxTeamSeats: number;
    features: Record<string, unknown>;
    isPublic: boolean;
    sortOrder: number;
  };
  usage: {
    workers: { current: number; limit: number };
    aiSpendDollars: { current: number; limit: number; monthStart: string };
  };
  invoices: ApiInvoice[];
};

function formatInvoiceAmount(cents: number, currency: string): string {
  const symbol = currency.toLowerCase() === "usd" ? "$" : "";
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

function formatInvoiceDate(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BillingPage() {
  const locale = useLocale();
  const copy = getAppBillingCopy(locale);
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [purchaseTarget, setPurchaseTarget] = useState<Plan | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/me", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled)
            setLoadError(`Failed to load billing (HTTP ${res.status}).`);
          return;
        }
        const body = (await res.json()) as BillingData;
        if (!cancelled) setData(body);
      } catch {
        if (!cancelled) setLoadError("Network error loading billing.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Match the tenant's actual plan against the copy catalog. If the
  // tenant's plan isn't in the displayed catalog, fall back to the
  // first entry so the picker UI still renders something meaningful.
  const currentPlanId: PlanId = useMemo(() => {
    const apiId = data?.tenant.planId;
    if (apiId) {
      const hit = copy.plans.find((p) => p.id === apiId);
      if (hit) return hit.id;
    }
    return copy.plans[0]?.id ?? "starter";
  }, [data, copy.plans]);
  const currentPlan = copy.plans.find((p) => p.id === currentPlanId) ??
    copy.plans[0]!;

  return (
    <PageShell
      title={copy.title}
      description={copy.description}
      actions={
        <Link
          href={localizePath("/pricing", locale)}
          target="_blank"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
        >
          {copy.compare}
          <IconArrowRight width={13} height={13} />
        </Link>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <Card className="lg:col-span-2 bg-ink text-white border-ink">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/50 mb-2">
                {copy.currentPlan}
              </p>
              <h2 className="text-[26px] font-medium tracking-[-0.02em] leading-none mb-2">
                {currentPlan.name}
              </h2>
              <p className="text-[13.5px] text-white/70 leading-[1.55] max-w-[420px]">
                {currentPlan.description}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[24px] font-medium tracking-[-0.02em] leading-none">
                {currentPlan.price}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/55 mt-1">
                {currentPlan.cadence} {copy.currency}
              </p>
            </div>
          </div>
          <div className="border-t border-white/15 pt-4 flex flex-wrap items-center gap-3">
            <a
              href="#plans"
              className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full bg-white text-ink hover:bg-white/90 transition-colors"
            >
              {copy.changePlan}
            </a>
            <button
              type="button"
              onClick={() =>
                setBillingCycle((c) => (c === "monthly" ? "annual" : "monthly"))
              }
              className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-white/20 text-white/85 hover:border-white/40 transition-colors"
            >
              {billingCycle === "monthly"
                ? copy.switchToAnnual
                : copy.switchToMonthly}
            </button>
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="ml-auto text-[12px] font-medium text-white/55 hover:text-white transition-colors"
            >
              {copy.cancelPlan}
            </button>
          </div>
        </Card>

        <Card>
          <SectionTitle label={copy.payment.title} />
          <div className="border border-rule rounded-md p-4 flex items-center gap-3 mb-3">
            <div className="size-10 rounded bg-canvas-soft border border-rule flex items-center justify-center">
              <span className="font-mono text-[10px] font-medium text-ink">
                {copy.payment.cardBrand}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-ink">
                {copy.payment.card}
              </p>
              <p className="text-[11.5px] text-ink-muted">
                {copy.payment.expires}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink hover:text-ink-muted transition-colors"
          >
            {copy.payment.update}
            <IconArrowRight width={12} height={12} />
          </button>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            {copy.payment.nextCharge} {currentPlan.price}
          </p>
        </Card>
      </div>

      <section id="plans" className="scroll-mt-20 mb-8">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-1">
              {copy.plansHeader.eyebrow}
            </p>
            <h2 className="text-[20px] font-medium tracking-[-0.02em] text-ink leading-tight">
              {copy.plansHeader.title}
            </h2>
          </div>

          <div className="inline-flex items-center gap-0 bg-canvas-soft border border-rule rounded-full p-0.5">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                billingCycle === "monthly"
                  ? "bg-card border border-rule text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {copy.cycles.monthly}
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                billingCycle === "annual"
                  ? "bg-card border border-rule text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {copy.cycles.annual}
              <span
                className={`ml-1.5 font-mono text-[10px] ${
                  billingCycle === "annual" ? "text-accent" : "text-ink-soft"
                }`}
              >
                {copy.discount}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-rule border border-rule rounded-[14px] overflow-hidden">
          {copy.plans.map((p) => {
            const isCurrent = p.id === currentPlanId;
            const displayPrice = computePrice(p.price, billingCycle);
            return (
              <article
                key={p.id}
                className={`relative h-full p-6 flex flex-col gap-4 ${
                  isCurrent
                    ? "bg-canvas-soft"
                    : "bg-card hover:bg-canvas-soft/40 transition-colors"
                }`}
              >
                {isCurrent && (
                  <span className="absolute top-4 right-4 font-mono text-[10px] uppercase tracking-[0.12em] text-accent inline-flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-accent" />
                    {copy.plansHeader.current}
                  </span>
                )}

                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-2">
                    {p.name}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[28px] font-medium tracking-[-0.025em] text-ink leading-none">
                      {displayPrice}
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      {p.id === "enterprise"
                        ? p.cadence
                        : billingCycle === "annual"
                        ? copy.cycles.annualSuffix
                        : copy.cycles.monthSuffix}
                    </span>
                  </div>
                  <p className="text-[12px] text-ink-muted leading-[1.55] mt-3 min-h-[36px]">
                    {p.description}
                  </p>
                </div>

                <div className="h-px bg-rule" />

                <ul className="flex-1 flex flex-col gap-2">
                  {p.features.slice(0, 6).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <IconCheck
                        className="text-ink-soft mt-[2px] shrink-0"
                        width={12}
                        height={12}
                      />
                      <span className="text-[12px] text-ink leading-[1.5]">
                        {f}
                      </span>
                    </li>
                  ))}
                  {p.features.length > 6 && (
                    <li className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft pl-4">
                      + {p.features.length - 6} {copy.plansHeader.more}
                    </li>
                  )}
                </ul>

                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center text-[12.5px] font-medium px-4 py-2 rounded-full border border-rule text-ink-muted cursor-not-allowed"
                  >
                    {copy.plansHeader.currentCta}
                  </button>
                ) : p.id === "enterprise" ? (
                  <Link
                    href={localizePath("/contact", locale)}
                    className="inline-flex items-center justify-center text-[12.5px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
                  >
                    {p.cta}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPurchaseTarget(p)}
                    className="inline-flex items-center justify-center text-[12.5px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
                  >
                    {p.cta}
                  </button>
                )}
              </article>
            );
          })}
        </div>

        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          {copy.plansHeader.footnote}
        </p>
      </section>

      <Card className="mb-6">
        <SectionTitle
          label={copy.usage.title}
          description={copy.usage.description}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-rule border border-rule rounded-[12px] overflow-hidden">
          {copy.usage.rows.map((u, idx) => {
            // Slot 0 = Workers, slot 1 = AI spend (re-purposed from the
            // "Messages this month" cell). Real data drives current/max for
            // these two; slots 2/3 keep the copy values (voice/API not
            // tracked server-side yet).
            let current: number = u.current;
            let max: number = u.max;
            let unit: string = u.unit;
            let prefix = "";
            if (data) {
              if (idx === 0) {
                current = data.usage.workers.current;
                // Plan limit -1 == unlimited; show a large display value.
                max =
                  data.usage.workers.limit === -1
                    ? Math.max(current, 1)
                    : data.usage.workers.limit;
              } else if (idx === 1) {
                current = Math.round(data.usage.aiSpendDollars.current);
                max =
                  data.usage.aiSpendDollars.limit === -1
                    ? Math.max(current, 1)
                    : data.usage.aiSpendDollars.limit;
                unit = "";
                prefix = "$";
              }
            }
            const pct = max > 0 ? Math.round((current / max) * 100) : 0;
            // Three-tone bar matching the in-app alert banners:
            //   <80% ink, 80-99% amber (heads-up), >=100% red (over cap)
            const barColor =
              pct >= 100
                ? "bg-[#B91C1C]"
                : pct >= 80
                  ? "bg-[#B45309]"
                  : "bg-ink";
            const isUnlimited =
              data &&
              ((idx === 0 && data.usage.workers.limit === -1) ||
                (idx === 1 && data.usage.aiSpendDollars.limit === -1));
            return (
              <div key={u.label} className="bg-card p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-2">
                  {u.label}
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[22px] font-medium tracking-[-0.02em] text-ink leading-none tabular-nums">
                    {prefix}
                    {current.toLocaleString(copy.numberLocale)}
                  </span>
                  <span className="text-[11.5px] text-ink-muted">
                    {isUnlimited
                      ? "/ ∞"
                      : `/ ${prefix}${max.toLocaleString(copy.numberLocale)}${unit ? ` ${unit}` : ""}`}
                  </span>
                </div>
                <div className="mt-3 h-1.5 bg-canvas-soft rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{
                      width: `${isUnlimited ? 0 : Math.min(pct, 100)}%`,
                    }}
                  />
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft mt-2">
                  {isUnlimited ? "∞" : `${pct}%`} {copy.usage.used}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card padded={false}>
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <SectionTitle
            label={copy.invoices.title}
            description={copy.invoices.description}
          />
          <button
            type="button"
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
          >
            {copy.invoices.downloadAll}
            <IconArrowRight width={12} height={12} />
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-canvas-soft/60 border-y border-rule text-left">
              <TableHead>{copy.invoices.headers.invoice}</TableHead>
              <TableHead>{copy.invoices.headers.date}</TableHead>
              <TableHead>{copy.invoices.headers.amount}</TableHead>
              <TableHead>{copy.invoices.headers.status}</TableHead>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {(data?.invoices ?? []).map((inv) => (
              <tr
                key={inv.id}
                className="hover:bg-canvas-soft/50 transition-colors"
              >
                <td className="px-5 py-3">
                  <code className="font-mono text-[12.5px] text-ink">
                    {inv.id.slice(0, 8)}
                  </code>
                </td>
                <td className="px-5 py-3 text-[13px] text-ink-muted">
                  {formatInvoiceDate(inv.issuedAt, copy.numberLocale)}
                </td>
                <td className="px-5 py-3 text-[13px] text-ink tabular-nums">
                  {formatInvoiceAmount(inv.amountCents, inv.currency)}
                </td>
                <td className="px-5 py-3">
                  <Badge tone={inv.status === "paid" ? "accent" : "soft"}>
                    {inv.status === "paid" ? copy.invoices.paid : inv.status}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  {inv.pdfUrl ? (
                    <a
                      href={inv.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
                    >
                      {copy.invoices.downloadPdf}
                    </a>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                      —
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {data && data.invoices.length === 0 && (
              <tr>
                <td
                  className="px-5 py-6 text-center text-[12.5px] text-ink-muted"
                  colSpan={5}
                >
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {(loading || loadError) && (
          <p className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            {loading ? "…" : loadError}
          </p>
        )}
      </Card>

      <PurchaseModal
        copy={copy}
        plan={purchaseTarget}
        currentPlan={currentPlan}
        cycle={billingCycle}
        onClose={() => setPurchaseTarget(null)}
        onConfirm={() => {
          // Plan changes are persisted via Stripe checkout / portal — the
          // UI just dismisses the modal and waits for the next refresh.
          setPurchaseTarget(null);
        }}
      />

      <ConfirmModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => setCancelOpen(false)}
        title={copy.cancel.title}
        confirmLabel={copy.cancel.confirm}
        tone="danger"
        body={
          <>
            <p>
              {copy.cancel.bodyBeforeDate}{" "}
              <strong>{copy.cancel.bodyDate}</strong>.{" "}
              {copy.cancel.bodyAfterDate}
            </p>
            <p className="mt-3 text-ink-soft font-mono text-[11px] uppercase tracking-[0.1em]">
              {copy.cancel.exportNotice}
            </p>
          </>
        }
      />
    </PageShell>
  );
}

function computePrice(price: string, cycle: BillingCycle): string {
  if (price.startsWith("$") === false) return price;
  if (cycle === "monthly") return price;
  const n = Number(price.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return price;
  const annualMonthly = Math.round(n * 0.8);
  return `$${annualMonthly}`;
}

function PurchaseModal({
  copy,
  plan,
  currentPlan,
  cycle,
  onClose,
  onConfirm,
}: {
  copy: BillingCopy;
  plan: Plan | null;
  currentPlan: Plan;
  cycle: BillingCycle;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!plan) return null;

  const isUpgrade =
    copy.plans.findIndex((p) => p.id === plan.id) >
    copy.plans.findIndex((p) => p.id === currentPlan.id);
  const displayPrice = computePrice(plan.price, cycle);
  const isAnnual = cycle === "annual";
  const workerLimit =
    plan.workerLimit === "unlimited" ? (
      copy.purchase.unlimited
    ) : (
      <>
        {copy.purchase.upToWorkersPrefix} {plan.workerLimit}{" "}
        {copy.purchase.upToWorkersSuffix}
      </>
    );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <button
        type="button"
        aria-label={copy.purchase.close}
        onClick={onClose}
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
      />
      <div className="relative bg-card border border-rule rounded-[14px] w-full max-w-[520px] shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)] overflow-hidden">
        <header className="px-6 pt-6 pb-3 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-2">
              {isUpgrade ? copy.purchase.upgrade : copy.purchase.switchPlan}
            </p>
            <h2 className="text-[20px] font-medium tracking-[-0.015em] text-ink inline-flex items-center gap-2">
              <span>{currentPlan.name}</span>
              <IconArrowRight width={14} height={14} />
              <span>{plan.name}</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.purchase.close}
            className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors"
          >
            <IconClose />
          </button>
        </header>

        <div className="px-6 pb-5">
          <div className="border border-rule rounded-[10px] overflow-hidden">
            <Row k={copy.purchase.newPlan} v={plan.name} />
            <Row k={copy.purchase.workerLimit} v={workerLimit} />
            <Row
              k={copy.purchase.billingCycle}
              v={isAnnual ? copy.cycles.annual : copy.cycles.monthly}
            />
            <Row
              k={copy.purchase.price}
              v={
                <span className="text-ink">
                  {displayPrice}{" "}
                  <span className="text-ink-soft">
                    {isAnnual ? copy.cycles.annualSuffix : copy.cycles.monthSuffix}
                  </span>
                </span>
              }
            />
            <Row
              k={copy.purchase.effective}
              v={isUpgrade ? copy.purchase.immediately : copy.purchase.endOfCycle}
            />
            <Row
              k={copy.purchase.todaysCharge}
              v={
                <span className="text-ink font-medium">
                  {isUpgrade
                    ? `${displayPrice} (${copy.purchase.prorated})`
                    : copy.purchase.noCharge}
                </span>
              }
              isLast
            />
          </div>

          <div className="mt-5 border border-rule rounded-[10px] p-4 flex items-center gap-3 bg-canvas-soft/40">
            <div className="size-9 rounded bg-card border border-rule flex items-center justify-center">
              <span className="font-mono text-[10px] font-medium text-ink">
                {copy.payment.cardBrand}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-ink">
                {copy.payment.card}
              </p>
              <p className="text-[11.5px] text-ink-muted">
                {copy.payment.expires}
              </p>
            </div>
            <button
              type="button"
              className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted hover:text-ink transition-colors"
            >
              {copy.payment.change}
            </button>
          </div>

          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft leading-relaxed">
            {isUpgrade ? copy.purchase.upgradeNotice : copy.purchase.switchNotice}
          </p>
        </div>

        <footer className="px-6 py-4 border-t border-rule bg-canvas-soft/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
          >
            {copy.purchase.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
          >
            {isUpgrade
              ? `${copy.purchase.confirmAndPay} ${displayPrice}`
              : copy.purchase.confirmSwitch}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Row({
  k,
  v,
  isLast,
}: {
  k: string;
  v: ReactNode;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 ${
        isLast ? "" : "border-b border-rule"
      }`}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
        {k}
      </span>
      <span className="text-[13px] text-ink">{v}</span>
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return (
    <th className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft px-5 py-2.5 font-normal">
      {children}
    </th>
  );
}
