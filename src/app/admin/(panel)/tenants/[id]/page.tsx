"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PageShell,
  Card,
  SectionTitle,
  Badge,
} from "@/components/app/PageShell";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import { IconArrowRight, IconClose } from "@/components/Icons";

const PLAN_OPTIONS = [
  { id: "starter", label: "Starter" },
  { id: "growth", label: "Growth" },
  { id: "business", label: "Business" },
  { id: "enterprise", label: "Enterprise" },
];

interface ApiTenant {
  id: string;
  name: string;
  slug: string;
  planId: string;
  status: string;
  country: string | null;
  locale: string;
  timezone: string;
  stripeCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
  trialEndsAt: string | null;
}
interface ApiTenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}
interface ApiTenantInvoice {
  id: string;
  stripeInvoiceId: string;
  planId: string;
  amountCents: number;
  currency: string;
  status: string;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
  issuedAt: string | null;
  paidAt: string | null;
}
interface ApiTenantTicket {
  id: string;
  code: string;
  subject: string;
  bodyPreview: string;
  status: string;
  priority: string;
  channel: string;
  reporterName: string;
  reporterEmail: string;
  createdAt: string;
  updatedAt: string;
}
interface ApiTenantWorker {
  id: string;
  name: string;
  roleSlug: string;
  status: string;
  createdAt: string;
}
interface TenantDetailPayload {
  tenant: ApiTenant;
  users: ApiTenantUser[];
  invoices: ApiTenantInvoice[];
  tickets: ApiTenantTicket[];
  workers: ApiTenantWorker[];
}

const STATUS_LABEL: Record<string, string> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Past due",
  suspended: "Suspended",
  canceled: "Churned",
};

function planLabel(id: string): string {
  if (!id) return "—";
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<TenantDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [forceResetOpen, setForceResetOpen] = useState(false);
  const [deprovisionOpen, setDeprovisionOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [rotateDekOpen, setRotateDekOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/tenants/${id}`, {
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as
          | TenantDetailPayload
          | { error?: string };
        if (cancelled) return;
        if (res.status === 404) {
          setNotFoundFlag(true);
          return;
        }
        if (!res.ok) {
          setLoadError(
            ("error" in body && body.error) || "Couldn't load tenant.",
          );
          return;
        }
        setData(body as TenantDetailPayload);
      } catch {
        if (!cancelled) setLoadError("Network error loading tenant.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (notFoundFlag) {
    return (
      <PageShell
        title="Tenant not found"
        description="No tenant with that id exists on the platform."
        crumbs={[{ label: "Tenants", href: "/admin/tenants" }, { label: id }]}
      >
        <Card>
          <p className="text-[13px] text-ink-muted">
            The tenant may have been deleted or the URL may be malformed.
          </p>
        </Card>
      </PageShell>
    );
  }

  if (loading || !data) {
    return (
      <PageShell
        title={loading ? "Loading tenant…" : "Tenant"}
        description={loadError ?? "Fetching tenant detail."}
        crumbs={[{ label: "Tenants", href: "/admin/tenants" }, { label: id }]}
      >
        {loadError && (
          <div className="mb-5 text-[13px] text-[#B91C1C] bg-[#FEE2E2] border border-[#B91C1C]/25 rounded-md px-3 py-2">
            {loadError}
          </div>
        )}
      </PageShell>
    );
  }

  const { tenant, users, invoices, tickets, workers } = data;

  const lifetimeRevenueCents = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amountCents, 0);

  const planName = planLabel(tenant.planId);
  const statusLabel = STATUS_LABEL[tenant.status] ?? tenant.status;
  const owner = users.find((u) => u.role === "Owner");
  const ownerEmail = owner?.email ?? "—";
  const ownerName = owner?.name ?? "—";

  const openTicketCount = tickets.filter(
    (t) => t.status === "open" || t.status === "pending",
  ).length;

  async function patchTenant(
    patch: { status?: "active" | "suspended"; planId?: string },
    message: string,
  ): Promise<void> {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setActionError(body.error ?? `Couldn't update tenant.`);
        return;
      }
      // Re-fetch the bundle so KPIs reflect the change.
      const refreshed = await fetch(`/api/admin/tenants/${id}`, {
        cache: "no-store",
      });
      const refreshedBody = (await refreshed.json().catch(() => null)) as
        | TenantDetailPayload
        | null;
      if (refreshedBody) setData(refreshedBody);
      setActionError(message);
    } catch {
      setActionError("Network error updating tenant.");
    } finally {
      setBusy(false);
    }
  }

  async function ownerPasswordReset(): Promise<void> {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/password-reset`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setActionError(body.error ?? "Couldn't trigger password reset.");
        return;
      }
      setActionError(`Password reset queued for ${ownerEmail}.`);
    } catch {
      setActionError("Network error sending password reset.");
    } finally {
      setBusy(false);
    }
  }

  async function forceResetAll(): Promise<void> {
    setBusy(true);
    setActionError(null);
    setForceResetOpen(false);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/force-reset-all`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        affected?: number;
      };
      if (!res.ok) {
        setActionError(body.error ?? "Couldn't force reset all users.");
        return;
      }
      setActionError(
        `Force reset complete · ${body.affected ?? 0} users signed out.`,
      );
    } catch {
      setActionError("Network error forcing reset.");
    } finally {
      setBusy(false);
    }
  }

  async function rotateDek(): Promise<void> {
    setBusy(true);
    setActionError(null);
    setRotateDekOpen(false);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/rotate-dek`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        newVersion?: number;
        rotated?: number;
        integrations?: number;
        userTotp?: number;
      };
      if (!res.ok) {
        setActionError(body.error ?? "Couldn't rotate encryption key.");
        return;
      }
      setActionError(
        `Encryption key rotated · v${body.newVersion ?? "?"} · ${
          body.rotated ?? 0
        } row(s) re-encrypted (${body.integrations ?? 0} integration, ${
          body.userTotp ?? 0
        } user TOTP).`,
      );
    } catch {
      setActionError("Network error rotating encryption key.");
    } finally {
      setBusy(false);
    }
  }

  async function deprovision(): Promise<void> {
    setBusy(true);
    setActionError(null);
    setDeprovisionOpen(false);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/deprovision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setActionError(body.error ?? "Couldn't deprovision tenant.");
        return;
      }
      router.push("/admin/tenants");
    } catch {
      setActionError("Network error deprovisioning tenant.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell
      title={tenant.name}
      description={`${planName} · ${tenant.country ?? "—"} · ${users.length} users · ${workers.length} workers hired`}
      crumbs={[
        { label: "Tenants", href: "/admin/tenants" },
        { label: tenant.name },
      ]}
      actions={
        <>
          {tenant.status === "suspended" ? (
            <button
              type="button"
              onClick={() =>
                patchTenant(
                  { status: "active" },
                  `${tenant.name} reactivated.`,
                )
              }
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full border border-rule text-ink hover:border-ink/30 disabled:opacity-40 transition-colors"
            >
              Reactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSuspendOpen(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full border border-rule text-[#B91C1C] hover:border-[#B91C1C]/40 hover:bg-[#B91C1C]/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Suspend
            </button>
          )}
          <button
            type="button"
            onClick={() => setPlanModalOpen(true)}
            disabled={busy}
            className="inline-flex items-center text-[13px] font-medium px-3.5 py-2 rounded-full border border-rule text-ink hover:border-ink/30 disabled:opacity-40 transition-colors"
          >
            Change plan
          </button>
          <button
            type="button"
            onClick={() => setImpersonateOpen(true)}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
          >
            Impersonate owner
            <IconArrowRight width={13} height={13} />
          </button>
        </>
      }
    >
      {actionError && (
        <div className="mb-5 text-[13px] text-ink bg-canvas-soft border border-rule rounded-md px-3 py-2">
          {actionError}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-rule rounded-[12px] border border-rule overflow-hidden mb-6">
        <Kpi label="Plan" value={planName} hint={`Status: ${statusLabel}`} />
        <Kpi
          label="Lifetime revenue"
          value={`$${(lifetimeRevenueCents / 100).toLocaleString("en-US")}`}
          hint={`${invoices.filter((i) => i.status === "paid").length} paid invoices`}
        />
        <Kpi
          label="Workers"
          value={String(workers.length)}
          hint={`${workers.filter((w) => w.status === "active").length} active`}
        />
        <Kpi
          label="Users"
          value={String(users.length)}
          hint={`${users.filter((u) => u.status === "Active").length} active`}
        />
        <Kpi
          label="Open tickets"
          value={String(openTicketCount)}
          hint={`${tickets.length} total`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: identity + recent activity */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Users */}
          <Card padded={false}>
            <div className="px-5 pt-5 pb-3 flex items-baseline justify-between">
              <SectionTitle
                label={`Users · ${users.length}`}
                description="People with workspace access."
              />
              <Link
                href="/admin/users"
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
              >
                All users →
              </Link>
            </div>
            <ul className="divide-y divide-rule">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="px-5 py-3 flex items-center gap-3"
                >
                  <span className="size-8 rounded-full bg-tint/60 border border-rule flex items-center justify-center font-mono text-[10px] font-medium text-ink shrink-0">
                    {initialsOf(u.name)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate">
                      {u.name}
                    </p>
                    <p className="text-[11.5px] text-ink-muted truncate">
                      {u.email}
                    </p>
                  </div>
                  <Badge tone={u.role === "Owner" ? "ink" : "neutral"}>
                    {u.role}
                  </Badge>
                  <span className="text-[11px] text-ink-soft tabular-nums hidden sm:inline">
                    {u.lastLoginAt ? u.lastLoginAt.slice(0, 10) : "—"}
                  </span>
                </li>
              ))}
              {users.length === 0 && (
                <li className="px-5 py-8 text-center text-[13px] text-ink-muted">
                  No users on this tenant.
                </li>
              )}
            </ul>
          </Card>

          {/* Workers */}
          <Card padded={false}>
            <div className="px-5 pt-5 pb-3 flex items-baseline justify-between">
              <SectionTitle
                label={`Workers · ${workers.length}`}
                description="AI workers hired on this tenant."
              />
            </div>
            <ul className="divide-y divide-rule">
              {workers.map((w) => (
                <li
                  key={w.id}
                  className="px-5 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate">
                      {w.name}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft mt-0.5">
                      {w.roleSlug}
                    </p>
                  </div>
                  <Badge tone={w.status === "active" ? "accent" : "neutral"}>
                    {w.status}
                  </Badge>
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft tabular-nums">
                    {w.createdAt.slice(0, 10)}
                  </span>
                </li>
              ))}
              {workers.length === 0 && (
                <li className="px-5 py-8 text-center text-[13px] text-ink-muted">
                  No workers hired yet.
                </li>
              )}
            </ul>
          </Card>

          {/* Invoices */}
          <Card padded={false}>
            <div className="px-5 pt-5 pb-3 flex items-baseline justify-between">
              <SectionTitle
                label={`Invoices · ${invoices.length}`}
                description="Last 12 months."
              />
              <Link
                href="/admin/billing"
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
              >
                Billing →
              </Link>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-canvas-soft/60 border-y border-rule text-left">
                  <th className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft px-5 py-2.5 font-normal">
                    Invoice
                  </th>
                  <th className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft px-5 py-2.5 font-normal">
                    Plan
                  </th>
                  <th className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft px-5 py-2.5 font-normal text-right">
                    Amount
                  </th>
                  <th className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft px-5 py-2.5 font-normal">
                    Status
                  </th>
                  <th className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft px-5 py-2.5 font-normal">
                    Issued
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-5 py-3">
                      <code className="font-mono text-[11.5px] text-ink">
                        {inv.stripeInvoiceId}
                      </code>
                    </td>
                    <td className="px-5 py-3 text-[12.5px] text-ink-muted">
                      {planLabel(inv.planId)}
                    </td>
                    <td className="px-5 py-3 text-right text-[12.5px] text-ink tabular-nums">
                      ${(inv.amountCents / 100).toLocaleString("en-US")}
                    </td>
                    <td className="px-5 py-3">
                      {inv.status === "paid" && <Badge tone="accent">Paid</Badge>}
                      {inv.status === "past_due" && <Badge tone="ink">Past due</Badge>}
                      {inv.status === "failed" && (
                        <span className="inline-flex items-center font-mono text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded border bg-[#FEE2E2] text-[#B91C1C] border-[#B91C1C]/25">
                          Failed
                        </span>
                      )}
                      {inv.status === "refunded" && (
                        <Badge tone="neutral">Refunded</Badge>
                      )}
                      {["draft", "open", "void"].includes(inv.status) && (
                        <Badge tone="neutral">{inv.status}</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-soft">
                      {inv.issuedAt ? inv.issuedAt.slice(0, 10) : "—"}
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-[13px] text-ink-muted"
                    >
                      No invoices yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          {/* Tickets */}
          <Card padded={false}>
            <div className="px-5 pt-5 pb-3 flex items-baseline justify-between">
              <SectionTitle
                label={`Tickets · ${tickets.length}`}
                description="Support history with this tenant."
              />
              <Link
                href="/admin/support"
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
              >
                Queue →
              </Link>
            </div>
            <ul className="divide-y divide-rule">
              {tickets.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/admin/support/${t.id}`}
                    className="block px-5 py-3 hover:bg-canvas-soft/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-[12.5px] font-medium text-ink truncate">
                        {t.subject}
                      </p>
                      <Badge
                        tone={
                          t.status === "resolved" || t.status === "closed"
                            ? "neutral"
                            : "soft"
                        }
                      >
                        {t.status}
                      </Badge>
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                      {t.code} · {t.priority} priority · {t.channel}
                    </p>
                  </Link>
                </li>
              ))}
              {tickets.length === 0 && (
                <li className="px-5 py-8 text-center text-[13px] text-ink-muted">
                  No tickets opened.
                </li>
              )}
            </ul>
          </Card>
        </div>

        {/* Right: meta */}
        <div className="flex flex-col gap-5">
          <Card>
            <SectionTitle label="Identity" />
            <dl className="flex flex-col divide-y divide-rule">
              <Detail
                k="Tenant ID"
                v={
                  <code className="font-mono text-[11px] text-ink">
                    {tenant.id.slice(0, 8)}…
                  </code>
                }
              />
              <Detail
                k="Slug"
                v={
                  <code className="font-mono text-[11px] text-ink">
                    {tenant.slug}
                  </code>
                }
              />
              <Detail
                k="Plan"
                v={
                  <Badge tone={planName === "Enterprise" ? "ink" : "neutral"}>
                    {planName}
                  </Badge>
                }
              />
              <Detail
                k="Status"
                v={
                  <Badge tone={tenant.status === "active" ? "accent" : "neutral"}>
                    {statusLabel}
                  </Badge>
                }
              />
              <Detail k="Country" v={tenant.country ?? "—"} />
              <Detail k="Locale" v={tenant.locale} />
              <Detail k="Timezone" v={tenant.timezone} />
              <Detail k="Signed up" v={tenant.createdAt.slice(0, 10)} />
              {tenant.trialEndsAt && (
                <Detail
                  k="Trial ends"
                  v={tenant.trialEndsAt.slice(0, 10)}
                />
              )}
              {tenant.stripeCustomerId && (
                <Detail
                  k="Stripe"
                  v={
                    <code className="font-mono text-[11px] text-ink">
                      {tenant.stripeCustomerId.slice(0, 12)}…
                    </code>
                  }
                />
              )}
            </dl>
          </Card>

          <Card>
            <SectionTitle label="Owner" />
            <div className="flex items-center gap-3 mb-4">
              <span className="size-10 rounded-full bg-tint/60 border border-rule flex items-center justify-center font-mono text-[11px] font-medium text-ink">
                {initialsOf(ownerName)}
              </span>
              <div>
                <p className="text-[13px] font-medium text-ink">{ownerName}</p>
                <p className="text-[12px] text-ink-muted truncate">
                  {ownerEmail}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={ownerPasswordReset}
              disabled={busy || !owner}
              className="w-full text-[12px] font-medium px-3 py-2 rounded-md border border-rule text-ink hover:border-ink/30 disabled:opacity-40 transition-colors"
            >
              Send password reset
            </button>
          </Card>

          <Card>
            <SectionTitle
              label="Danger zone"
              description="Actions a tenant cannot reverse alone."
            />
            <div className="flex flex-col gap-2">
              {tenant.status === "suspended" ? (
                <button
                  type="button"
                  onClick={() =>
                    patchTenant(
                      { status: "active" },
                      `${tenant.name} reactivated.`,
                    )
                  }
                  disabled={busy}
                  className="text-left px-3 py-2 rounded-md border border-rule text-[12.5px] text-ink hover:border-ink/30 disabled:opacity-40 transition-colors"
                >
                  Reactivate tenant
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSuspendOpen(true)}
                  disabled={busy}
                  className="text-left px-3 py-2 rounded-md border border-rule text-[12.5px] text-ink hover:border-[#B91C1C]/40 hover:text-[#B91C1C] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Suspend tenant
                </button>
              )}
              <button
                type="button"
                onClick={() => setForceResetOpen(true)}
                disabled={busy}
                className="text-left px-3 py-2 rounded-md border border-rule text-[12.5px] text-ink hover:border-[#B91C1C]/40 hover:text-[#B91C1C] disabled:opacity-40 transition-colors"
              >
                Force password reset on all users
              </button>
              <button
                type="button"
                onClick={() => setRotateDekOpen(true)}
                disabled={busy}
                className="text-left px-3 py-2 rounded-md border border-rule text-[12.5px] text-ink hover:border-ink/30 disabled:opacity-40 transition-colors"
              >
                Rotate encryption key
              </button>
              <button
                type="button"
                onClick={() => setDeprovisionOpen(true)}
                disabled={busy}
                className="text-left px-3 py-2 rounded-md border border-rule text-[12.5px] text-ink hover:border-[#B91C1C]/40 hover:text-[#B91C1C] disabled:opacity-40 transition-colors"
              >
                Wipe &amp; deprovision tenant
              </button>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        onConfirm={() => {
          setSuspendOpen(false);
          void patchTenant(
            { status: "suspended" },
            `${tenant.name} suspended.`,
          );
        }}
        title={`Suspend ${tenant.name}?`}
        confirmLabel="Suspend tenant"
        tone="danger"
        body={
          <p>
            All AI workers stop responding. Users see a maintenance banner.
            Billing pauses. Reversible from this page.
          </p>
        }
      />

      <ConfirmModal
        open={forceResetOpen}
        onClose={() => setForceResetOpen(false)}
        onConfirm={forceResetAll}
        title={`Force password reset on all users?`}
        confirmLabel={`Reset all (${users.length})`}
        tone="danger"
        body={
          <p>
            Every user on {tenant.name} is signed out and required to set a new
            password on next login. Use only on suspected credential leak.
          </p>
        }
      />

      <ConfirmModal
        open={rotateDekOpen}
        onClose={() => setRotateDekOpen(false)}
        onConfirm={rotateDek}
        title={`Rotate encryption key for ${tenant.name}?`}
        confirmLabel="Rotate key"
        body={
          <>
            <p>
              Generates a fresh per-tenant DEK and re-encrypts every stored
              integration secret + TOTP secret in a single transaction. Reads
              keep working throughout. Use on suspected KEK or DEK compromise.
            </p>
            <p className="mt-3 text-ink-soft font-mono text-[11px] uppercase tracking-[0.1em]">
              Atomic · audit-logged · safe to retry
            </p>
          </>
        }
      />

      <ConfirmModal
        open={deprovisionOpen}
        onClose={() => setDeprovisionOpen(false)}
        onConfirm={deprovision}
        title={`Wipe & deprovision ${tenant.name}?`}
        confirmLabel="Deprovision tenant"
        tone="danger"
        body={
          <>
            <p>
              Tenant is suspended immediately and scheduled for full data wipe
              after a 30-day retention window.
            </p>
            <p className="mt-3 text-ink-soft font-mono text-[11px] uppercase tracking-[0.1em]">
              Reversible during the 30-day window · audit-logged
            </p>
          </>
        }
      />

      {planModalOpen && (
        <PlanModal
          currentPlanId={tenant.planId}
          tenantName={tenant.name}
          busy={busy}
          onClose={() => setPlanModalOpen(false)}
          onConfirm={async (planId) => {
            setPlanModalOpen(false);
            await patchTenant(
              { planId },
              `Plan changed to ${planLabel(planId)}.`,
            );
          }}
        />
      )}

      <ConfirmModal
        open={impersonateOpen}
        onClose={() => setImpersonateOpen(false)}
        onConfirm={() => setImpersonateOpen(false)}
        title={`Impersonate ${ownerName}?`}
        confirmLabel="Continue as owner"
        body={
          <>
            <p>
              You&apos;ll be signed in as {ownerName} on{" "}
              <span className="text-ink">{tenant.name}</span>. Every click is
              logged to the audit trail with your staff ID attached.
            </p>
            <p className="mt-3 text-ink-soft font-mono text-[11px] uppercase tracking-[0.1em]">
              Session capped at 1 hour · automatic logout
            </p>
          </>
        }
      />
    </PageShell>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-2">
        {label}
      </p>
      <p className="text-[20px] font-medium tracking-[-0.02em] text-ink leading-none tabular-nums">
        {value}
      </p>
      {hint && (
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft mt-2">
          {hint}
        </p>
      )}
    </div>
  );
}

function Detail({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
        {k}
      </dt>
      <dd className="text-[12.5px] text-ink text-right">{v}</dd>
    </div>
  );
}

function PlanModal({
  currentPlanId,
  tenantName,
  busy,
  onClose,
  onConfirm,
}: {
  currentPlanId: string;
  tenantName: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (planId: string) => void | Promise<void>;
}) {
  const [selected, setSelected] = useState<string>(currentPlanId);
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
              Change plan
            </p>
            <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink">
              {tenantName}
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
        <div className="px-6 pb-3 flex flex-col gap-2">
          {PLAN_OPTIONS.map((p) => (
            <label
              key={p.id}
              className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${
                selected === p.id
                  ? "border-ink bg-canvas-soft"
                  : "border-rule hover:border-ink/25"
              }`}
            >
              <span className="text-[13px] text-ink">{p.label}</span>
              <input
                type="radio"
                name="plan"
                value={p.id}
                checked={selected === p.id}
                onChange={() => setSelected(p.id)}
                className="sr-only"
              />
              <span
                className={`size-3.5 rounded-full border-2 ${
                  selected === p.id ? "border-ink bg-ink" : "border-rule"
                }`}
              />
            </label>
          ))}
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft mt-3">
            Stripe subscription sync runs in Sprint 17 · this is the mirror-only
            change for now.
          </p>
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
            disabled={busy || selected === currentPlanId}
            onClick={() => onConfirm(selected)}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 disabled:opacity-40 transition-colors"
          >
            {busy ? "Saving…" : "Save plan"}
          </button>
        </footer>
      </div>
    </div>
  );
}
