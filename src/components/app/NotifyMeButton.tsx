"use client";

import { useState } from "react";

/**
 * "Notify me" control for roadmap (q3) catalog roles. Posts the
 * operator's interest to /api/catalog-roles/[slug]/notify, which records
 * it in the security-events ledger. On success the button is replaced
 * with an inline confirmation; on error an inline message lets the user
 * retry. No mock — a failed request surfaces the real error state.
 */
export function NotifyMeButton({
  slug,
  labels,
}: {
  slug: string;
  labels: {
    notify: string;
    notifySubmitting: string;
    notifySuccess: string;
    notifyError: string;
  };
}) {
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">(
    "idle",
  );

  async function submit() {
    if (state === "submitting" || state === "done") return;
    setState("submitting");
    try {
      const res = await fetch(
        `/api/catalog-roles/${encodeURIComponent(slug)}/notify`,
        { method: "POST" },
      );
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
      setState(res.ok && json.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p
        role="status"
        className="text-[13px] text-[#15803D] bg-[#DCFCE7] border border-[#15803D]/25 rounded-full px-4 py-2 inline-flex items-center"
      >
        {labels.notifySuccess}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 items-start">
      <button
        type="button"
        onClick={submit}
        disabled={state === "submitting"}
        className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 disabled:opacity-60 transition-colors"
      >
        {state === "submitting" ? labels.notifySubmitting : labels.notify}
      </button>
      {state === "error" && (
        <span role="alert" className="text-[12px] text-[#B91C1C]">
          {labels.notifyError}
        </span>
      )}
    </div>
  );
}
