"use client";

import { useState } from "react";

/**
 * Add a Brand Bible source. Three real modes, all wired to
 * POST /api/brand-bible:
 *   - paste → JSON { kind:"paste", title, text }
 *   - url   → JSON { kind:"url", title, url }   (worker fetches it)
 *   - file  → multipart/form-data with the PDF/DOCX
 *
 * On success the parent refetches the source list. No mock — failures
 * surface the API error inline.
 */
export interface AddSourceLabels {
  title: string;
  description: string;
  tabPaste: string;
  tabUrl: string;
  tabFile: string;
  titleLabel: string;
  titlePlaceholder: string;
  textLabel: string;
  textPlaceholder: string;
  urlLabel: string;
  urlPlaceholder: string;
  fileLabel: string;
  submit: string;
  submitting: string;
  cancel: string;
  errorGeneric: string;
  errorTitle: string;
  errorText: string;
  errorUrl: string;
  errorFile: string;
  success: string;
}

type Mode = "paste" | "url" | "file";

export function AddSourceModal({
  open,
  labels,
  onClose,
  onAdded,
}: {
  open: boolean;
  labels: AddSourceLabels;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [mode, setMode] = useState<Mode>("paste");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function reset() {
    setTitle("");
    setText("");
    setUrl("");
    setFile(null);
    setError(null);
    setMode("paste");
  }

  async function submit() {
    setError(null);
    if (mode !== "file" && !title.trim()) {
      setError(labels.errorTitle);
      return;
    }
    let req: Promise<Response>;
    if (mode === "paste") {
      if (!text.trim()) {
        setError(labels.errorText);
        return;
      }
      req = fetch("/api/brand-bible", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "paste", title: title.trim(), text }),
      });
    } else if (mode === "url") {
      try {
        const u = new URL(url.trim());
        if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
      } catch {
        setError(labels.errorUrl);
        return;
      }
      req = fetch("/api/brand-bible", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "url", title: title.trim(), url: url.trim() }),
      });
    } else {
      if (!file) {
        setError(labels.errorFile);
        return;
      }
      const fd = new FormData();
      fd.set("file", file);
      if (title.trim()) fd.set("title", title.trim());
      req = fetch("/api/brand-bible", { method: "POST", body: fd });
    }

    setBusy(true);
    try {
      const res = await req;
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? labels.errorGeneric);
        return;
      }
      reset();
      onAdded();
      onClose();
    } catch {
      setError(labels.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  const tabs: Array<{ id: Mode; label: string }> = [
    { id: "paste", label: labels.tabPaste },
    { id: "url", label: labels.tabUrl },
    { id: "file", label: labels.tabFile },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={labels.title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label={labels.cancel}
        onClick={onClose}
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-[520px] bg-card border border-rule rounded-[14px] shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)]">
        <header className="px-6 pt-6 pb-3">
          <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink">
            {labels.title}
          </h2>
          <p className="text-[12.5px] text-ink-muted mt-1 leading-[1.55]">
            {labels.description}
          </p>
        </header>

        <div className="px-6">
          <div className="flex gap-1 border-b border-rule">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMode(tab.id);
                  setError(null);
                }}
                className={`text-[12.5px] font-medium px-3 py-2 -mb-px border-b-2 transition-colors ${
                  mode === tab.id
                    ? "border-ink text-ink"
                    : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {mode !== "file" && (
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                {labels.titleLabel}
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={labels.titlePlaceholder}
                className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors"
              />
            </label>
          )}

          {mode === "paste" && (
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                {labels.textLabel}
              </span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder={labels.textPlaceholder}
                className="bg-transparent text-[13px] text-ink py-2 px-3 border border-rule rounded-md focus:border-ink focus:outline-none transition-colors resize-y"
              />
            </label>
          )}

          {mode === "url" && (
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                {labels.urlLabel}
              </span>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={labels.urlPlaceholder}
                className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors"
              />
            </label>
          )}

          {mode === "file" && (
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                {labels.fileLabel}
              </span>
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-[13px] text-ink file:mr-3 file:rounded-full file:border file:border-rule file:bg-canvas-soft file:px-3 file:py-1.5 file:text-[12px] file:text-ink"
              />
            </label>
          )}

          {error && (
            <p role="alert" className="text-[12.5px] text-[#B91C1C]">
              {error}
            </p>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-rule bg-canvas-soft/60 rounded-b-[14px] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 disabled:opacity-60 transition-colors"
          >
            {busy ? labels.submitting : labels.submit}
          </button>
        </footer>
      </div>
    </div>
  );
}
