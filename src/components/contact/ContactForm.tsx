"use client";

import { useState, type FormEvent } from "react";
import { Reveal } from "@/components/Reveal";

/**
 * Client-side contact form. Posts to `/api/contact`. Renders the same
 * markup the old static page used, plus an inline status line and a
 * disabled-submit state during the request.
 *
 * Honeypot: an off-screen `hp_field` input. Real users never fill it; if
 * a bot does, the server silently accepts and drops the submission so
 * the bot can't tell it was filtered.
 */
export interface ContactFormCopy {
  title: string;
  firstName: string;
  firstNamePlaceholder: string;
  lastName: string;
  lastNamePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  company: string;
  companyPlaceholder: string;
  topic: string;
  message: string;
  messagePlaceholder: string;
  submit: string;
  responseTime: string;
  successMessage?: string;
  errorMessage?: string;
  submittingLabel?: string;
}

export function ContactForm({
  copy,
  topics,
  locale,
}: {
  copy: ContactFormCopy;
  topics: string[];
  locale: string;
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const submitting = status === "submitting";
  const ok = status === "ok";

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (submitting) return;
    setStatus("submitting");
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const topicIndex = String(data.get("topic") ?? "topic-0");
    const topicMatch = /^topic-(\d+)$/.exec(topicIndex);
    const topicLabel =
      topicMatch && Number(topicMatch[1]) < topics.length
        ? topics[Number(topicMatch[1])]
        : (topics[0] ?? "general");

    const payload = {
      firstName: String(data.get("firstName") ?? "").trim(),
      lastName: String(data.get("lastName") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      company: String(data.get("company") ?? "").trim(),
      topic: topicLabel,
      message: String(data.get("message") ?? "").trim(),
      hp_field: String(data.get("hp_field") ?? ""),
      locale,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setStatus("error");
        setError(json.error ?? copy.errorMessage ?? "Submission failed.");
        return;
      }
      setStatus("ok");
      form.reset();
    } catch {
      setStatus("error");
      setError(copy.errorMessage ?? "Submission failed.");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-6 max-w-[560px]"
      noValidate
    >
      {/* Honeypot — visually hidden, also off-screen for screen readers
          ignoring CSS display:none. Real submissions leave this empty. */}
      <input
        type="text"
        name="hp_field"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-10000px",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      <Reveal delay={0.05}>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label={copy.firstName}
            name="firstName"
            autoComplete="given-name"
            placeholder={copy.firstNamePlaceholder}
            required
          />
          <Field
            label={copy.lastName}
            name="lastName"
            autoComplete="family-name"
            placeholder={copy.lastNamePlaceholder}
            required
          />
        </div>
      </Reveal>
      <Reveal delay={0.1}>
        <Field
          label={copy.email}
          name="email"
          type="email"
          autoComplete="email"
          placeholder={copy.emailPlaceholder}
          required
        />
      </Reveal>
      <Reveal delay={0.14}>
        <Field
          label={copy.company}
          name="company"
          autoComplete="organization"
          placeholder={copy.companyPlaceholder}
        />
      </Reveal>
      <Reveal delay={0.18}>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
            {copy.topic}
          </span>
          <div className="relative">
            <select
              name="topic"
              className="appearance-none w-full bg-transparent text-[14px] text-ink py-2 pr-8 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors"
              defaultValue="topic-0"
            >
              {topics.map((topic, index) => (
                <option key={topic} value={`topic-${index}`}>
                  {topic}
                </option>
              ))}
            </select>
            <svg
              aria-hidden
              width="10"
              height="10"
              viewBox="0 0 10 10"
              className="absolute right-1 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none"
            >
              <path
                d="M2 4l3 3 3-3"
                stroke="currentColor"
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </label>
      </Reveal>
      <Reveal delay={0.22}>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
            {copy.message}
          </span>
          <textarea
            name="message"
            rows={5}
            placeholder={copy.messagePlaceholder}
            required
            minLength={10}
            className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors placeholder:text-ink-soft resize-none"
          />
        </label>
      </Reveal>
      <Reveal delay={0.26}>
        <button
          type="submit"
          disabled={submitting}
          className="self-start mt-3 inline-flex items-center justify-center text-[13.5px] font-medium px-5 py-3 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors disabled:opacity-60"
        >
          {submitting ? (copy.submittingLabel ?? copy.submit) : copy.submit}
        </button>
      </Reveal>
      <Reveal delay={0.32}>
        <p
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft"
          role={ok || status === "error" ? "status" : undefined}
          aria-live={ok || status === "error" ? "polite" : undefined}
        >
          {ok
            ? (copy.successMessage ?? "Thanks — we'll be in touch.")
            : status === "error"
              ? (error ?? copy.errorMessage ?? "Submission failed.")
              : copy.responseTime}
        </p>
      </Reveal>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </span>
      <input
        type={type}
        name={name}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors placeholder:text-ink-soft"
      />
    </label>
  );
}
