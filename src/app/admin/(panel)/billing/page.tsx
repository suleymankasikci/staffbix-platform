"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PageShell,
  Card,
  Badge,
} from "@/components/app/PageShell";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import { Pagination } from "@/components/app/Pagination";
import { IconSearch } from "@/components/Icons";
import type { PlatformInvoice } from "@/lib/admin-types";

const STATUSES = ["All", "Paid", "Past due", "Failed", "Refunded"] as const;
const PAGE_SIZES = [10, 25, 50] as const;

/** API shape — superset of PlatformInvoice with tenantName + Stripe ids. */
interface ApiInvoice extends PlatformInvoice {
  tenantName: string;
  hostedInvoiceUrl?: string | null;
  pdfUrl?: string | null;
  stripeInvoiceId?: string;
}

export default function AdminBillingPage() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("All");
  const [q, setQ] = useState("");
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refundId, setRefundId] = useState<string | null>(null);
  const [retryId, setRetryId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/billing", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
          invoices?: ApiInvoice[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(data.error ?? "Couldn't load invoices.");
          return;
        }
        setInvoices(data.invoices ?? []);
      } catch {
        if (!cancelled) setLoadError("Network error loading invoices.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const target = (refundId ?? retryId)
    ? invoices.find((i) => i.id === (refundId ?? retryId))
    : null;

  function tenantName(i: ApiInvoice) {
    return i.tenantName;
  }

  const filtered = useMemo(() => {
    return invoices.filter((i) => {
      if (status !== "All" && i.status !== status) return false;
      if (q) {
        const n = q.toLowerCase();
        if (
          !i.id.toLowerCase().includes(n) &&
          !tenantName(i).toLowerCase().includes(n) &&
          !i.plan.toLowerCase().includes(n)
        )
          return false;
      }
      return true;
    });
  }, [invoices, status, q]);

  useEffect(() => {
    setPage(1);
  }, [status, q, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const sliceStart = (currentPage - 1) * pageSize;
  const sliceEnd = Math.min(sliceStart + pageSize, filtered.length);
  const visible = filtered.slice(sliceStart, sliceEnd);

  const collected = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const failed = invoices.filter((i) => i.status === "Failed" || i.status === "Past due").reduce((s, i) => s + i.amount, 0);
  const refunded = invoices.filter((i) => i.status === "Refunded").reduce((s, i) => s + i.amount, 0);

  async function doRefund() {
    if (!refundId) return;
    setActionError(null);
    setBusy(refundId);
    try {
      const res = await fetch(`/api/admin/billing/${refundId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setActionError(body.error ?? "Couldn't refund invoice.");
        return;
      }
      setInvoices((is) =>
        is.map((i) => (i.id === refundId ? { ...i, status: "Refunded" } : i)),
      );
      setRefundId(null);
    } catch {
      setActionError("Network error refunding invoice.");
    } finally {
      setBusy(null);
    }
  }
  async function doRetry() {
    if (!retryId) return;
    setActionError(null);
    setBusy(retryId);
    try {
      const res = await fetch(`/api/admin/billing/${retryId}/retry`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        stripeStatus?: string;
        error?: string;
      };
      if (!res.ok) {
        setActionError(body.error ?? "Couldn't retry invoice.");
        return;
      }
      if (body.ok) {
        setInvoices((is) =>
          is.map((i) =>
            i.id === retryId
              ? {
                  ...i,
                  status: "Paid",
                  paidAt: new Date().toISOString().split("T")[0] ?? null,
                }
              : i,
          ),
        );
      } else {
        setActionError(
          `Retry attempted · Stripe status: ${body.stripeStatus ?? "unknown"}.`,
        );
      }
      setRetryId(null);
    } catch {
      setActionError("Network error retrying invoice.");
    } finally {
      setBusy(null);
    }
  }

  function exportCsv() {
    window.location.href = "/api/admin/billing/export";
  }

  function downloadPdf(i: ApiInvoice) {
    // Stripe-hosted PDFs are served directly — open in a new tab so
    // the operator keeps the admin panel in their current tab.
    const url = i.pdfUrl || i.hostedInvoiceUrl;
    if (!url) {
      setActionError("No PDF available for this invoice yet.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <PageShell
      title="Billing"
      description="Cross-tenant invoices, failed payments, refunds. Stripe handles taxes — this is the operational view."
      actions={
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
        >
          Export CSV
        </button>
      }
    >
      {actionError && (
        <div className="mb-3 rounded-md border border-rule bg-canvas-soft px-3 py-2 text-[12.5px] text-ink">
          {actionError}
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-rule rounded-[12px] border border-rule overflow-hidden mb-6">
        <Stat label="Collected · this month" value={`$${collected.toLocaleString("en-US")}`} hint={`${invoices.filter(i => i.status === "Paid").length} paid invoices`} />
        <Stat label="At risk" value={`$${failed.toLocaleString("en-US")}`} hint={`${invoices.filter(i => i.status === "Failed" || i.status === "Past due").length} need action`} />
        <Stat label="Refunded" value={`$${refunded.toLocaleString("en-US")}`} hint="Last 30 days" />
        <Stat label="Avg invoice" value={`$${Math.round(collected / Math.max(1, invoices.filter(i => i.status === "Paid").length)).toLocaleString("en-US")}`} hint="Per paid invoice" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => {
            const active = status === s;
            const count = s === "All" ? invoices.length : invoices.filter((i) => i.status === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  active ? "bg-ink text-white border-ink" : "bg-card text-ink-muted border-rule hover:border-ink/30 hover:text-ink"
                }`}
              >
                {s}
                <span className={`font-mono text-[10px] ${active ? "text-white/70" : "text-ink-soft"}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="inline-flex items-center gap-2 border border-rule rounded-md px-3 h-9 bg-card min-w-[260px]">
          <IconSearch className="text-ink-soft shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Invoice ID, tenant, plan..."
            className="flex-1 bg-transparent text-[12.5px] text-ink placeholder:text-ink-soft border-0 focus:outline-none"
          />
        </div>
      </div>

      {loadError && (
        <div className="mb-3 rounded-md border border-rule bg-canvas-soft px-3 py-2 text-[12.5px] text-[#B91C1C]">
          {loadError}
        </div>
      )}

      <Card padded={false}>
        {loading && (
          <div className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            Loading…
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-canvas-soft/60 border-b border-rule text-left">
                <Th>Invoice</Th>
                <Th>Tenant</Th>
                <Th>Plan</Th>
                <Th align="right">Amount</Th>
                <Th>Issued</Th>
                <Th>Paid</Th>
                <Th>Status</Th>
                <Th>{""}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {visible.map((i) => (
                <tr key={i.id} className="hover:bg-canvas-soft/50 transition-colors">
                  <Td>
                    <code className="font-mono text-[12px] text-ink">{i.id}</code>
                  </Td>
                  <Td>
                    <Link href={`/admin/tenants/${i.tenantId}`} className="text-[12.5px] text-ink hover:text-ink-muted transition-colors">
                      {tenantName(i)}
                    </Link>
                  </Td>
                  <Td><span className="text-[12.5px] text-ink-muted">{i.plan}</span></Td>
                  <Td align="right"><span className="font-mono text-[12.5px] text-ink tabular-nums">${i.amount.toLocaleString("en-US")}</span></Td>
                  <Td><span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">{i.issuedAt}</span></Td>
                  <Td><span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">{i.paidAt ?? "—"}</span></Td>
                  <Td>
                    {i.status === "Paid" && <Badge tone="accent">Paid</Badge>}
                    {i.status === "Past due" && <Badge tone="ink">Past due</Badge>}
                    {i.status === "Failed" && (
                      <span className="inline-flex items-center font-mono text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded border bg-[#FEE2E2] text-[#B91C1C] border-[#B91C1C]/25">Failed</span>
                    )}
                    {i.status === "Refunded" && <Badge tone="neutral">Refunded</Badge>}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      {(i.status === "Failed" || i.status === "Past due") && (
                        <button
                          type="button"
                          onClick={() => setRetryId(i.id)}
                          disabled={busy === i.id}
                          className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink hover:text-ink-muted transition-colors px-2 py-1 rounded border border-rule hover:border-ink/25 disabled:opacity-40"
                        >
                          Retry
                        </button>
                      )}
                      {i.status === "Paid" && (
                        <button
                          type="button"
                          onClick={() => setRefundId(i.id)}
                          disabled={busy === i.id}
                          className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#B91C1C] hover:text-[#991B1B] transition-colors px-2 py-1 rounded border border-rule hover:border-[#B91C1C]/30 disabled:opacity-40"
                        >
                          Refund
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => downloadPdf(i)}
                        disabled={!i.pdfUrl && !i.hostedInvoiceUrl}
                        className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted hover:text-ink transition-colors px-2 py-1 disabled:opacity-40"
                      >
                        PDF
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizes={PAGE_SIZES}
            total={filtered.length}
            sliceStart={sliceStart}
            sliceEnd={sliceEnd}
            onPageChange={setPage}
            onPageSizeChange={(s) => setPageSize(s)}
          />
        )}
      </Card>

      <ConfirmModal
        open={Boolean(refundId)}
        onClose={() => setRefundId(null)}
        onConfirm={doRefund}
        title={`Refund ${target?.id}?`}
        confirmLabel={`Refund $${target?.amount.toLocaleString("en-US")}`}
        tone="danger"
        body={<p>Issues a full refund of ${target?.amount} to the original payment method. Audit log records this action.</p>}
      />
      <ConfirmModal
        open={Boolean(retryId)}
        onClose={() => setRetryId(null)}
        onConfirm={doRetry}
        title={`Retry payment on ${target?.id}?`}
        confirmLabel="Retry now"
        body={<p>Attempts the charge again against the card on file. If it fails, tenant moves to suspended after 7 days.</p>}
      />
    </PageShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-2">{label}</p>
      <p className="text-[22px] font-medium tracking-[-0.02em] text-ink leading-none tabular-nums">{value}</p>
      {hint && <p className="text-[11.5px] text-ink-muted mt-2">{hint}</p>}
    </div>
  );
}
function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className={`font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft px-4 py-2.5 font-normal ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <td className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}>{children}</td>;
}
