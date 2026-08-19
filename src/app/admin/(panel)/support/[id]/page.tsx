"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  PageShell,
  Card,
  SectionTitle,
  Badge,
} from "@/components/app/PageShell";

interface ApiTicket {
  id: string;
  code: string;
  subject: string;
  bodyPreview: string;
  status: "open" | "pending" | "resolved" | "closed";
  priority: "critical" | "high" | "normal" | "low";
  channel: "email" | "in_app" | "api" | "widget";
  tenantId: string;
  tenantName: string;
  reporterEmail: string;
  reporterName: string;
  assignedWorkerId: string | null;
  assignedUserId: string | null;
  conversationId: string | null;
  externalThreadId: string | null;
  triage: unknown;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

const PRIORITY_LABEL: Record<string, string> = {
  critical: "Critical",
  high: "High",
  normal: "Normal",
  low: "Low",
};
const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  pending: "Pending",
  resolved: "Resolved",
  closed: "Closed",
};

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [ticket, setTicket] = useState<ApiTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function patch(
    body: { status?: string; priority?: string; assignedUserId?: string | null },
    successMessage: string,
  ): Promise<void> {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const resp = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setActionError(resp.error ?? "Couldn't update ticket.");
        return;
      }
      // Re-fetch the ticket to capture canonical timestamps (e.g.,
      // resolvedAt) the server just stamped.
      const refreshed = await fetch(`/api/admin/tickets/${id}`, {
        cache: "no-store",
      });
      const refreshedBody = (await refreshed.json().catch(() => null)) as
        | { ticket?: ApiTicket }
        | null;
      if (refreshedBody?.ticket) setTicket(refreshedBody.ticket);
      setActionError(successMessage);
    } catch {
      setActionError("Network error updating ticket.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/tickets/${id}`, {
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as
          | { ticket?: ApiTicket; error?: string };
        if (cancelled) return;
        if (res.status === 404) {
          setNotFoundFlag(true);
          return;
        }
        if (!res.ok) {
          setLoadError(body.error ?? "Couldn't load ticket.");
          return;
        }
        setTicket(body.ticket ?? null);
      } catch {
        if (!cancelled) setLoadError("Network error loading ticket.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function submit(e: FormEvent) {
    e.preventDefault();
    setReply("");
    // Sprint 15: ticket-reply pipeline (drafts to email channel +
    // conversation history). Until then we surface an inline note.
    setActionError("Reply pipeline lands in Sprint 15.");
  }

  if (notFoundFlag) {
    return (
      <PageShell
        title="Ticket not found"
        description="No support ticket with that id exists."
        crumbs={[{ label: "Support", href: "/admin/support" }, { label: id }]}
      >
        <Card>
          <p className="text-[13px] text-ink-muted">
            The ticket may have been deleted or the URL may be malformed.
          </p>
        </Card>
      </PageShell>
    );
  }

  if (loading || !ticket) {
    return (
      <PageShell
        title={loading ? "Loading ticket…" : "Ticket"}
        description={loadError ?? "Fetching ticket detail."}
        crumbs={[{ label: "Support", href: "/admin/support" }, { label: id }]}
      >
        {loadError && (
          <div className="mb-5 text-[13px] text-[#B91C1C] bg-[#FEE2E2] border border-[#B91C1C]/25 rounded-md px-3 py-2">
            {loadError}
          </div>
        )}
      </PageShell>
    );
  }

  const priorityLabel = PRIORITY_LABEL[ticket.priority] ?? ticket.priority;
  const statusLabel = STATUS_LABEL[ticket.status] ?? ticket.status;

  return (
    <PageShell
      title={ticket.subject}
      description={`${ticket.code} · ${ticket.channel} · Opened by ${ticket.reporterName}`}
      crumbs={[
        { label: "Support", href: "/admin/support" },
        { label: ticket.code },
      ]}
      actions={
        <>
          <button
            type="button"
            onClick={() =>
              patch({ status: "closed" }, `${ticket.code} closed.`)
            }
            disabled={busy || ticket.status === "closed"}
            className="inline-flex items-center text-[13px] font-medium px-3.5 py-2 rounded-full border border-rule text-ink hover:border-ink/30 disabled:opacity-40 transition-colors"
          >
            Close ticket
          </button>
          <button
            type="button"
            onClick={() =>
              patch({ status: "resolved" }, `${ticket.code} resolved.`)
            }
            disabled={busy || ticket.status === "resolved"}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full bg-ink text-white hover:bg-ink/85 disabled:opacity-40 transition-colors"
          >
            Mark resolved
          </button>
        </>
      }
    >
      {actionError && (
        <div className="mb-5 text-[13px] text-ink bg-canvas-soft border border-rule rounded-md px-3 py-2">
          {actionError}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Thread */}
        <Card padded={false} className="lg:col-span-2">
          <div className="px-5 py-3 border-b border-rule flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                tone={
                  ticket.priority === "critical" || ticket.priority === "high"
                    ? "ink"
                    : "neutral"
                }
              >
                {priorityLabel}
              </Badge>
              <Badge
                tone={
                  ticket.status === "open" || ticket.status === "pending"
                    ? "soft"
                    : "neutral"
                }
              >
                {statusLabel}
              </Badge>
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                {ticket.channel}
              </span>
            </div>
          </div>

          <div className="px-5 py-5 flex flex-col gap-5">
            {/* Original message */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
                <span className="text-ink">{ticket.reporterName}</span>
                <span className="text-ink-soft/60">·</span>
                <span>
                  {ticket.createdAt.replace("T", " ").slice(0, 19)}
                </span>
              </div>
              <div className="text-[14px] text-ink leading-[1.6] bg-canvas-soft/50 border border-rule rounded-md p-4 whitespace-pre-wrap">
                {ticket.bodyPreview}
              </div>
            </div>

            {/* Triage summary if present */}
            {ticket.triage !== null && ticket.triage !== undefined && (
              <div className="flex flex-col gap-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
                  Triage
                </p>
                <pre className="text-[12px] text-ink-muted leading-[1.5] bg-canvas-soft/30 border border-rule rounded-md p-3 overflow-x-auto">
                  {JSON.stringify(ticket.triage, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <form
            onSubmit={submit}
            className="border-t border-rule p-4 flex items-end gap-2"
          >
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              placeholder="Reply as Support. Markdown supported."
              className="flex-1 bg-transparent text-[13px] text-ink py-2 border border-rule rounded-md px-3 focus:border-ink focus:outline-none transition-colors resize-none placeholder:text-ink-soft"
            />
            <button
              type="submit"
              className="inline-flex items-center text-[13px] font-medium px-4 py-2.5 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors shrink-0"
            >
              Send reply
            </button>
          </form>
        </Card>

        {/* Sidebar */}
        <div className="flex flex-col gap-5">
          <Card>
            <SectionTitle label="Reporter" />
            <div className="flex items-center gap-3 mb-3">
              <span className="size-10 rounded-full bg-tint/60 border border-rule flex items-center justify-center font-mono text-[11px] font-medium text-ink">
                {ticket.reporterName
                  .split(" ")
                  .map((s) => s[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink truncate">
                  {ticket.reporterName}
                </p>
                <p className="text-[11.5px] text-ink-muted truncate">
                  {ticket.reporterEmail}
                </p>
              </div>
            </div>
            <Link
              href={`/admin/tenants/${ticket.tenantId}`}
              className="inline-flex items-center gap-2 mt-2 text-[12px] font-medium text-ink hover:text-ink-muted transition-colors"
            >
              {ticket.tenantName} →
            </Link>
          </Card>

          <Card>
            <SectionTitle label="Assignment" />
            <p className="text-[12px] text-ink-muted mb-3">
              {ticket.assignedUserId
                ? "Assigned to staff member"
                : ticket.assignedWorkerId
                  ? "Assigned to AI worker"
                  : "Unassigned"}
            </p>
            <button
              type="button"
              onClick={() =>
                // Sprint 15 lands the picker UI for staff + AI worker
                // reassignment. Until then this button un-assigns the
                // ticket so a human can re-pick it from the queue.
                patch({ assignedUserId: null }, "Ticket unassigned.")
              }
              disabled={busy}
              className="w-full text-[12px] font-medium px-3 py-2 rounded-md border border-rule text-ink hover:border-ink/30 disabled:opacity-40 transition-colors"
            >
              {ticket.assignedUserId ? "Unassign" : "Unassigned"}
            </button>
          </Card>

          <Card>
            <SectionTitle label="Timeline" />
            <dl className="flex flex-col divide-y divide-rule -mx-1">
              <Detail
                k="Opened"
                v={ticket.createdAt.replace("T", " ").slice(0, 19)}
              />
              <Detail
                k="Updated"
                v={ticket.updatedAt.replace("T", " ").slice(0, 19)}
              />
              {ticket.resolvedAt && (
                <Detail
                  k="Resolved"
                  v={ticket.resolvedAt.replace("T", " ").slice(0, 19)}
                />
              )}
              <Detail k="Channel" v={ticket.channel} />
              <Detail
                k="Priority"
                v={
                  <Badge
                    tone={ticket.priority === "critical" ? "ink" : "neutral"}
                  >
                    {priorityLabel}
                  </Badge>
                }
              />
              <Detail k="Code" v={ticket.code} />
            </dl>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function Detail({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 px-1">
      <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
        {k}
      </dt>
      <dd className="text-[12.5px] text-ink text-right">{v}</dd>
    </div>
  );
}
