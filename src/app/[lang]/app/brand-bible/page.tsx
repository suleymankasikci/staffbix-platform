"use client";

import { useEffect, useState } from "react";
import { PageShell, Card, SectionTitle, Badge } from "@/components/app/PageShell";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import { AddSourceModal } from "@/components/app/AddSourceModal";
import {
  IconEdit,
  IconPlus,
  IconTrash,
  IconArrowRight,
} from "@/components/Icons";
import { useLocale } from "@/lib/i18n/client";
import { getAppBrandBibleCopy } from "@/lib/i18n/page-copy";

type Field = {
  key: string;
  values: string[];
  source: string;
  synced: boolean;
};

type ApiSource = {
  id: string;
  title: string;
  kind: "paste" | "pdf" | "docx" | "url";
  status: "uploaded" | "parsing" | "embedding" | "ready" | "failed";
  sizeBytes: number | null;
  chunkCount: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function BrandBiblePage() {
  const locale = useLocale();
  const copy = getAppBrandBibleCopy(locale);
  const [fields, setFields] = useState<Field[]>(() =>
    copy.fields.map((field) => ({
      ...field,
      values: [...field.values],
    }))
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [deleteKey, setDeleteKey] = useState<string | null>(null);

  const [sources, setSources] = useState<ApiSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  async function loadSources() {
    try {
      const res = await fetch("/api/brand-bible", { cache: "no-store" });
      if (!res.ok) {
        setSourcesError(`Failed to load sources (HTTP ${res.status}).`);
        return;
      }
      const data = (await res.json()) as { sources: ApiSource[] };
      setSources(data.sources ?? []);
      setSourcesError(null);
    } catch {
      setSourcesError("Network error loading sources.");
    } finally {
      setSourcesLoading(false);
    }
  }

  useEffect(() => {
    void loadSources();
  }, []);

  function startEdit(key: string) {
    const f = fields.find((x) => x.key === key);
    if (!f) return;
    setEditing(key);
    setDraft(f.values.join("\n"));
  }

  function saveEdit() {
    if (!editing) return;
    setFields((fs) =>
      fs.map((f) =>
        f.key === editing
          ? {
              ...f,
              values: draft.split("\n").filter((x) => x.trim().length > 0),
            }
          : f
      )
    );
    setEditing(null);
  }

  function doDelete() {
    if (!deleteKey) return;
    setFields((fs) => fs.filter((f) => f.key !== deleteKey));
    setDeleteKey(null);
  }

  const completion = Math.round((fields.length / 6) * 87);

  return (
    <PageShell
      title={copy.title}
      description={copy.description}
      actions={
        <>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
          >
            {copy.exportJson}
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
          >
            <IconPlus width={13} height={13} />
            {copy.addSource}
          </button>
        </>
      }
    >
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-1">
              {copy.readiness.title}
            </p>
            <p className="text-[28px] font-medium tracking-[-0.025em] text-ink leading-none">
              {completion}%
            </p>
            <p className="text-[12.5px] text-ink-muted mt-2 max-w-[460px]">
              {copy.readiness.hint}
            </p>
          </div>
          <div className="flex-1 max-w-[400px]">
            <div className="h-2 bg-canvas-soft rounded-full overflow-hidden">
              <div
                className="h-full bg-ink rounded-full transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
              <span>
                {fields.length} / 8 {copy.readiness.fieldsPopulated}
              </span>
              <button
                type="button"
                className="text-ink-muted hover:text-ink transition-colors"
              >
                {copy.readiness.showMissing} →
              </button>
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-6">
        <SectionTitle
          label={copy.sources.title}
          description={copy.sources.description}
        />
        <Card padded={false}>
          {sourcesLoading ? (
            <div className="px-4 py-6 text-center text-[12px] text-ink-soft">…</div>
          ) : sourcesError ? (
            <div className="px-4 py-6 text-center text-[12px] text-ink-muted">
              {sourcesError}
            </div>
          ) : sources.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12px] text-ink-muted">
              {copy.sources.description}
            </div>
          ) : (
            <ul className="divide-y divide-rule">
              {sources.map((s) => (
                <li
                  key={s.id}
                  className="px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-ink truncate">
                      {s.title}
                    </p>
                    <p className="text-[11px] text-ink-soft mt-0.5">
                      {s.kind.toUpperCase()} · {s.chunkCount} chunks · {formatDate(s.createdAt)}
                    </p>
                  </div>
                  <Badge tone={s.status === "ready" ? "accent" : s.status === "failed" ? "ink" : "soft"}>
                    {s.status === "ready" ? copy.synced : s.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
            Local notes — sync coming in next release
          </p>
          {fields.map((f) => (
            <Card key={f.key}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-1">
                    {f.key}
                  </p>
                  <p className="text-[11px] text-ink-soft">{f.source}</p>
                </div>
                <div className="flex items-center gap-1">
                  {f.synced && <Badge tone="accent">{copy.synced}</Badge>}
                  <button
                    type="button"
                    onClick={() => startEdit(f.key)}
                    className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors"
                    aria-label={`${copy.actions.edit} ${f.key}`}
                  >
                    <IconEdit width={14} height={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteKey(f.key)}
                    className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-[#B91C1C] hover:bg-canvas-soft transition-colors"
                    aria-label={`${copy.actions.delete} ${f.key}`}
                  >
                    <IconTrash width={14} height={14} />
                  </button>
                </div>
              </div>

              {editing === f.key ? (
                <div>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={Math.max(3, draft.split("\n").length)}
                    className="w-full bg-transparent text-[13px] text-ink py-2 border border-rule rounded-md px-3 focus:border-ink focus:outline-none transition-colors"
                  />
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="inline-flex items-center text-[12px] font-medium px-3 py-1.5 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
                    >
                      {copy.actions.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="inline-flex items-center text-[12px] font-medium px-3 py-1.5 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
                    >
                      {copy.actions.save}
                    </button>
                  </div>
                </div>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {f.values.map((v, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span
                        aria-hidden
                        className="mt-[7px] block size-1 rounded-full bg-ink-soft shrink-0"
                      />
                      <span className="text-[13px] text-ink leading-[1.55]">
                        {v}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>

        <div>
          <SectionTitle
            label={copy.sources.title}
            description={copy.sources.description}
          />
          <Card padded={false}>
            <ul className="divide-y divide-rule">
              {copy.sources.rows.map((s) => (
                <li
                  key={s.label}
                  className="px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-ink truncate">
                      {s.label}
                    </p>
                    <p className="text-[11px] text-ink-soft mt-0.5">
                      {s.date}
                    </p>
                  </div>
                  <Badge tone={s.state === "synced" ? "accent" : "soft"}>
                    {s.state === "synced" ? copy.synced : copy.pending}
                  </Badge>
                </li>
              ))}
            </ul>
            <div className="border-t border-rule px-4 py-3">
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink hover:text-ink-muted transition-colors"
              >
                <IconPlus width={13} height={13} />
                {copy.addSource}
              </button>
            </div>
          </Card>

          <SectionTitle
            label={copy.readers.title}
            description={copy.readers.description}
          />
          <Card padded={false}>
            <ul className="divide-y divide-rule">
              {copy.readers.rows.map((r) => (
                <li
                  key={r}
                  className="px-4 py-2.5 flex items-center justify-between"
                >
                  <span className="text-[12.5px] text-ink">{r}</span>
                  <IconArrowRight
                    className="text-ink-soft"
                    width={13}
                    height={13}
                  />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <AddSourceModal
        open={addOpen}
        labels={copy.addSourceModal}
        onClose={() => setAddOpen(false)}
        onAdded={() => void loadSources()}
      />

      <ConfirmModal
        open={Boolean(deleteKey)}
        onClose={() => setDeleteKey(null)}
        onConfirm={doDelete}
        title={`${copy.deleteModal.titlePrefix} "${deleteKey}" ${copy.deleteModal.titleSuffix}`}
        confirmLabel={copy.deleteModal.confirm}
        tone="danger"
        body={
          <>
            <p>{copy.deleteModal.body}</p>
            <p className="mt-3 text-ink-soft font-mono text-[11px] uppercase tracking-[0.1em]">
              {copy.deleteModal.notice}
            </p>
          </>
        }
      />
    </PageShell>
  );
}
