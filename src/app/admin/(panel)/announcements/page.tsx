"use client";

import { useEffect, useState } from "react";
import {
  PageShell,
  Card,
  Badge,
} from "@/components/app/PageShell";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import { IconPlus, IconEdit, IconTrash, IconClose } from "@/components/Icons";

// Sprint 15: announcements are now backed by the `announcements` table.
// The page fetches /api/admin/announcements on mount and pushes
// create / update / delete through the matching CRUD endpoints.

type AudienceVal = "all" | "free_trial" | "paid" | "enterprise";
type SeverityVal = "info" | "notice" | "critical";
type StatusVal = "draft" | "scheduled" | "live" | "ended";

interface ApiAnnouncement {
  id: string;
  title: string;
  body: string;
  audience: AudienceVal;
  severity: SeverityVal;
  status: StatusVal;
  startsAt: string | null;
  endsAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const AUDIENCE_LABEL: Record<AudienceVal, string> = {
  all: "All tenants",
  free_trial: "Free trial",
  paid: "Paid plans",
  enterprise: "Enterprise",
};
const SEVERITY_LABEL: Record<SeverityVal, string> = {
  info: "Info",
  notice: "Notice",
  critical: "Critical",
};

function fmtRange(starts: string | null, ends: string | null): string {
  const s = starts ? starts.replace("T", " ").replace(/:\d{2}\.\d+Z$/, "Z") : "—";
  const e = ends ? ends.replace("T", " ").replace(/:\d{2}\.\d+Z$/, "Z") : "—";
  return `${s} → ${e}`;
}

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<ApiAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const editing = editId ? items.find((i) => i.id === editId) ?? null : null;
  const target = deleteId ? items.find((i) => i.id === deleteId) ?? null : null;

  async function reload() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/announcements", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        announcements?: ApiAnnouncement[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(data.error ?? "Couldn't load announcements.");
        return;
      }
      setItems(data.announcements ?? []);
    } catch {
      setLoadError("Network error loading announcements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function createAnnouncement(input: {
    title: string;
    body: string;
    audience: AudienceVal;
    severity: SeverityVal;
    status: StatusVal;
  }) {
    setActionError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "Couldn't create announcement.");
        return;
      }
      setComposeOpen(false);
      await reload();
    } catch {
      setActionError("Network error creating announcement.");
    } finally {
      setBusy(false);
    }
  }

  async function updateAnnouncement(
    id: string,
    input: {
      title: string;
      body: string;
      audience: AudienceVal;
      severity: SeverityVal;
      status: StatusVal;
    },
  ) {
    setActionError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "Couldn't update announcement.");
        return;
      }
      setEditId(null);
      await reload();
    } catch {
      setActionError("Network error updating announcement.");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!deleteId) return;
    setActionError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/announcements/${deleteId}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "Couldn't delete announcement.");
        return;
      }
      setItems((is) => is.filter((i) => i.id !== deleteId));
      setDeleteId(null);
    } catch {
      setActionError("Network error deleting announcement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell
      title="Announcements"
      description="Broadcast banners that appear in every tenant's customer app. Use sparingly — over-banner is the fastest way to numb attention."
      actions={
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
        >
          <IconPlus width={13} height={13} />
          Compose announcement
        </button>
      }
    >
      {actionError && (
        <div className="mb-3 rounded-md border border-rule bg-canvas-soft px-3 py-2 text-[12.5px] text-[#B91C1C]">
          {actionError}
        </div>
      )}
      {loadError && (
        <div className="mb-3 rounded-md border border-rule bg-canvas-soft px-3 py-2 text-[12.5px] text-[#B91C1C]">
          {loadError}
        </div>
      )}
      {loading && (
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          Loading…
        </div>
      )}

      <div className="flex flex-col gap-3">
        {items.map((a) => (
          <Card key={a.id}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                {a.status === "live" && <Badge tone="accent">Live</Badge>}
                {a.status === "scheduled" && <Badge tone="soft">Scheduled</Badge>}
                {a.status === "draft" && <Badge tone="neutral">Draft</Badge>}
                {a.status === "ended" && <Badge tone="neutral">Ended</Badge>}
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                  {AUDIENCE_LABEL[a.audience]}
                </span>
                <span className="text-ink-soft/60 font-mono text-[10px]">·</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                  {SEVERITY_LABEL[a.severity]}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditId(a.id)}
                  className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors"
                  aria-label="Edit"
                >
                  <IconEdit width={14} height={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(a.id)}
                  className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-[#B91C1C] hover:bg-canvas-soft transition-colors"
                  aria-label="Delete"
                >
                  <IconTrash width={14} height={14} />
                </button>
              </div>
            </div>
            <h3 className="text-[15px] font-medium tracking-[-0.01em] text-ink leading-tight mb-1.5">
              {a.title}
            </h3>
            <p className="text-[13px] text-ink-muted leading-[1.6] mb-3">{a.body}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
              {fmtRange(a.startsAt, a.endsAt)}
            </p>
          </Card>
        ))}
        {!loading && items.length === 0 && !loadError && (
          <Card>
            <p className="text-[13px] text-ink-muted">No announcements yet.</p>
          </Card>
        )}
      </div>

      {composeOpen && (
        <ComposeModal
          busy={busy}
          onClose={() => setComposeOpen(false)}
          onSubmit={createAnnouncement}
        />
      )}
      {editing && (
        <ComposeModal
          busy={busy}
          initial={editing}
          onClose={() => setEditId(null)}
          onSubmit={(v) => updateAnnouncement(editing.id, v)}
        />
      )}

      <ConfirmModal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={doDelete}
        title={`Delete "${target?.title ?? ""}"?`}
        confirmLabel="Delete announcement"
        tone="danger"
        body={
          <p>
            Banner is removed from every tenant immediately. Audit log preserves
            the announcement history.
          </p>
        }
      />
    </PageShell>
  );
}

function ComposeModal({
  initial,
  busy,
  onClose,
  onSubmit,
}: {
  initial?: ApiAnnouncement;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    body: string;
    audience: AudienceVal;
    severity: SeverityVal;
    status: StatusVal;
  }) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [audience, setAudience] = useState<AudienceVal>(initial?.audience ?? "all");
  const [severity, setSeverity] = useState<SeverityVal>(initial?.severity ?? "info");
  const [status, setStatus] = useState<StatusVal>(initial?.status ?? "draft");

  function submit(targetStatus: StatusVal) {
    if (!title.trim() || !body.trim()) return;
    onSubmit({
      title: title.trim(),
      body: body.trim(),
      audience,
      severity,
      status: targetStatus,
    });
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute inset-0 bg-ink/30 backdrop-blur-sm" />
      <div className="relative bg-card border border-rule rounded-[14px] w-full max-w-[560px] shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)] max-h-[90vh] overflow-y-auto">
        <header className="px-6 pt-6 pb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-2">
              {initial ? "Edit" : "Compose"}
            </p>
            <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink">
              {initial ? "Update announcement." : "New announcement."}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors">
            <IconClose />
          </button>
        </header>
        <div className="px-6 pb-5 flex flex-col gap-5">
          <Field label="Title (becomes the banner headline)" value={title} onChange={setTitle} />
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">Body</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="bg-transparent text-[13px] text-ink py-2 px-3 border border-rule rounded-md focus:border-ink focus:outline-none transition-colors resize-none"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">Audience</span>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as AudienceVal)}
                className="bg-transparent text-[13px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none"
              >
                <option value="all">All tenants</option>
                <option value="free_trial">Free trial</option>
                <option value="paid">Paid plans</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">Severity</span>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as SeverityVal)}
                className="bg-transparent text-[13px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none"
              >
                <option value="info">Info</option>
                <option value="notice">Notice</option>
                <option value="critical">Critical</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusVal)}
              className="bg-transparent text-[13px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="ended">Ended</option>
            </select>
          </label>
        </div>
        <footer className="px-6 py-4 border-t border-rule bg-canvas-soft/60 rounded-b-[14px] flex items-center justify-end gap-2">
          {!initial && (
            <button
              type="button"
              disabled={busy}
              onClick={() => submit("draft")}
              className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors disabled:opacity-50"
            >
              Save draft
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => submit(initial ? status : "live")}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors disabled:opacity-50"
          >
            {initial ? "Save changes" : "Publish"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors"
      />
    </label>
  );
}
