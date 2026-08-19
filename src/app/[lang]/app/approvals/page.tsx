"use client";

import { useEffect, useState } from "react";
import { PageShell, Card, Badge } from "@/components/app/PageShell";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import { IconCheck, IconClose } from "@/components/Icons";
import { useLocale } from "@/lib/i18n/client";
import { getAppApprovalsCopy } from "@/lib/i18n/page-copy";

type ApprovalsCopy = ReturnType<typeof getAppApprovalsCopy>;

// The i18n copy is `as const`, so its inferred `approvals[number]` pins
// every string to a literal type. That's fine for the mock data but
// useless for dynamic API rows. Define a UI-side struct with open string
// types that the API-derived shape satisfies. `ApprovalsCopy` is still
// used as the `copy` parameter type on the row component.
interface Approval {
  id: string;
  worker: { initials: string; name: string };
  age: string;
  priority: "high" | "routine";
  title: string;
  body: string;
  spend: string;
  channels?: readonly string[];
  /** Whether the action can be safely reversed after dispatch. */
  reversible?: boolean;
  /** Voice-fit score 0-100. NULL until the model produces a critique. */
  voiceMatch?: number;
}
type Filter = "all" | "high" | "routine";

/** worker_actions row shape returned by GET /api/approvals (Sprint 6) */
interface ApiAction {
  id: string;
  workerId: string;
  conversationId: string | null;
  kind: "web_reply" | "whatsapp_reply" | "email_send" | "social_post";
  status: string;
  content: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

/**
 * Map a worker_actions row to the existing UI Approval shape. We don't
 * have priority/spend/worker.initials in worker_actions yet, so we
 * synthesize placeholders. Sprint 9 will add a denormalized worker name
 * + priority to the query response.
 */
function apiToUi(action: ApiAction, copy: ApprovalsCopy): Approval {
  const ageMs = Date.now() - new Date(action.createdAt).getTime();
  const ageMin = Math.max(1, Math.round(ageMs / 60_000));
  const age = ageMin < 60 ? `${ageMin}m` : `${Math.round(ageMin / 60)}h`;
  const channel =
    (action.payload?.channel as string | undefined)?.toLowerCase() ?? "";
  const titleByKind: Record<ApiAction["kind"], string> = {
    web_reply: copy.titleByKind.webReply,
    whatsapp_reply: `${copy.titleByKind.whatsappReplyPrefix} (${(action.payload as { fromPhone?: string }).fromPhone ?? "unknown"})`,
    email_send: copy.titleByKind.emailSend,
    social_post: channel
      ? `${channel[0].toUpperCase() + channel.slice(1)} ${copy.titleByKind.socialPostSuffix}`
      : copy.titleByKind.socialPostFallback,
  };
  return {
    id: action.id,
    worker: { initials: "AI", name: copy.workerLabel },
    age,
    priority: "routine",
    title: titleByKind[action.kind],
    body: action.content,
    spend: "—",
    channels: ["chat"],
    reversible: action.kind !== "email_send" && action.kind !== "social_post",
    voiceMatch: 95, // placeholder until Sprint 9 wires a voice-fit score
  };
}

export default function ApprovalsPage() {
  const locale = useLocale();
  const copy = getAppApprovalsCopy(locale);
  const [filter, setFilter] = useState<Filter>("all");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const filters: Filter[] = ["all", "high", "routine"];

  // Live fetch on mount. The route is auth-gated (session cookie); a
  // 401 means the panel layout will redirect the user to /login on
  // its next navigation.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/approvals", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
          approvals?: ApiAction[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(data.error ?? copy.status.loadFailed);
          return;
        }
        setItems((data.approvals ?? []).map((a) => apiToUi(a, copy)));
      } catch {
        if (!cancelled) setLoadError(copy.status.networkError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [copy]);

  const filtered = items.filter(
    (a) => filter === "all" || a.priority === filter
  );

  async function approve(id: string) {
    // Optimistic remove
    setItems((xs) => xs.filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: "approve" }),
      });
      if (!res.ok) {
        // Reload to re-sync on failure.
        const list = await fetch("/api/approvals").then((r) => r.json());
        setItems(((list.approvals as ApiAction[] | undefined) ?? []).map((a) => apiToUi(a, copy)));
      }
    } catch {
      /* will resync on next mount */
    }
  }

  async function reject(id: string) {
    setItems((xs) => xs.filter((x) => x.id !== id));
    setRejectId(null);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: "reject" }),
      });
      if (!res.ok) {
        const list = await fetch("/api/approvals").then((r) => r.json());
        setItems(((list.approvals as ApiAction[] | undefined) ?? []).map((a) => apiToUi(a, copy)));
      }
    } catch {
      /* will resync */
    }
  }

  return (
    <PageShell
      title={copy.title}
      description={copy.description}
      actions={
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-accent" />
            {items.length} {copy.pending}
          </span>
          <span className="text-ink-soft/60">{copy.separator}</span>
          <span>{copy.auditLog} →</span>
        </div>
      }
    >
      {loadError && (
        <div className="mb-5 text-[13px] text-[#B91C1C] bg-[#FEE2E2] border border-[#B91C1C]/25 rounded-md px-3 py-2">
          {loadError}
        </div>
      )}
      {loading && (
        <div className="mb-5 text-[12.5px] text-ink-muted">{copy.status.loading}</div>
      )}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {filters.map((f) => {
          const active = filter === f;
          const count =
            f === "all" ? items.length : items.filter((x) => x.priority === f).length;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                active
                  ? "bg-ink text-white border-ink"
                  : "bg-card text-ink-muted border-rule hover:border-ink/30 hover:text-ink"
              }`}
            >
              {copy.filters[f]}
              <span
                className={`font-mono text-[10px] ${
                  active ? "text-white/70" : "text-ink-soft"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((a) => (
          <ApprovalRow
            key={a.id}
            approval={a}
            copy={copy}
            onApprove={() => approve(a.id)}
            onReject={() => setRejectId(a.id)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="text-center py-14">
          <p className="text-[14px] text-ink mb-1">{copy.empty.title}</p>
          <p className="text-[12.5px] text-ink-muted">
            {copy.empty.description}
          </p>
        </Card>
      )}

      <ConfirmModal
        open={Boolean(rejectId)}
        onClose={() => setRejectId(null)}
        onConfirm={() => rejectId && reject(rejectId)}
        title={copy.modal.title}
        confirmLabel={copy.modal.confirm}
        tone="danger"
        body={
          <>
            <p>{copy.modal.body}</p>
            <textarea
              rows={3}
              placeholder={copy.modal.placeholder}
              className="w-full mt-4 bg-transparent text-[13px] text-ink py-2 border border-rule rounded-md px-3 focus:border-ink focus:outline-none transition-colors resize-none placeholder:text-ink-soft"
            />
          </>
        }
      />
    </PageShell>
  );
}

function ApprovalRow({
  approval,
  copy,
  onApprove,
  onReject,
}: {
  approval: Approval;
  copy: ApprovalsCopy;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card>
      <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="size-9 rounded-full bg-tint/60 border border-rule flex items-center justify-center font-mono text-[10px] font-medium text-ink shrink-0">
            {approval.worker.initials}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
                {approval.worker.name}
              </span>
              <span className="text-ink-soft/60 font-mono text-[10px]">
                {copy.separator}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
                {approval.age} {copy.row.ago}
              </span>
              <Badge
                tone={
                  approval.priority === "high" ? "ink" : "neutral"
                }
              >
                {copy.priorities[approval.priority]}
              </Badge>
            </div>
            <h3 className="text-[14.5px] font-medium tracking-[-0.005em] text-ink leading-[1.3] mb-1.5">
              {approval.title}
            </h3>
            <p className="text-[12.5px] text-ink-muted leading-[1.6]">
              {approval.body}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
              <span>
                {copy.row.spend} {approval.spend}
              </span>
              <span className="text-ink-soft/60">{copy.separator}</span>
              <span>
                {approval.reversible ? copy.row.reversible : copy.row.notReversible}
              </span>
              <span className="text-ink-soft/60">{copy.separator}</span>
              <span>
                {copy.row.voiceMatch} {approval.voiceMatch}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 md:self-start">
          <button
            type="button"
            onClick={onReject}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
          >
            <IconClose width={13} height={13} />
            {copy.row.reject}
          </button>
          <button
            type="button"
            onClick={onApprove}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-2 rounded-full bg-accent text-white hover:bg-accent-deep transition-colors"
          >
            <IconCheck width={13} height={13} />
            {copy.row.approve}
          </button>
        </div>
      </div>
    </Card>
  );
}
