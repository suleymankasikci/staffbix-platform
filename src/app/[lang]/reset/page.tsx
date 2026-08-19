"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { Reveal } from "@/components/Reveal";
import type { Locale } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/client";
import { getAuthCopy } from "@/lib/i18n/page-copy";
import { localizePath } from "@/lib/i18n/routing";

type Step = "request" | "sent";
type AuthCopy = ReturnType<typeof getAuthCopy>;

export default function ResetPage() {
  const locale = useLocale();
  const copy = getAuthCopy(locale);
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");

  function handleRequest(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStep("sent");
  }

  return (
    <main className="min-h-screen flex flex-col md:grid md:grid-cols-2">
      <div className="flex flex-col px-6 md:px-12 lg:px-20 py-8 md:py-12">
        <header className="mb-auto">
          <BrandLogo />
        </header>

        <Reveal>
          <div className="max-w-[400px] mx-auto md:mx-0 py-10 md:py-16 w-full">
            {step === "request" ? (
              <RequestStep
                copy={copy}
                locale={locale}
                email={email}
                setEmail={setEmail}
                onSubmit={handleRequest}
              />
            ) : (
              <SentStep
                copy={copy}
                locale={locale}
                email={email}
                onChangeEmail={() => setStep("request")}
              />
            )}
          </div>
        </Reveal>

        <footer className="mt-auto pt-10 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          <Link href={localizePath("/", locale)} className="hover:text-ink transition-colors">
            {copy.common.backHome}
          </Link>
          <span>{copy.common.version}</span>
        </footer>
      </div>

      <aside className="hidden md:flex bg-tint/40 px-12 lg:px-20 py-12 flex-col">
        <div className="mb-auto">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            {copy.reset.sideEyebrow}
          </p>
        </div>

        <Reveal delay={0.1}>
          <div className="max-w-[400px]">
            <h2 className="text-[28px] lg:text-[32px] font-medium tracking-[-0.025em] leading-[1.15] text-ink mb-8">
              {copy.reset.sideTitle}
            </h2>
            <ul className="flex flex-col gap-4">
              {copy.reset.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-[6px] block size-1.5 rounded-full bg-accent shrink-0"
                  />
                  <span className="text-[13.5px] text-ink leading-[1.55]">
                    {perk}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <div className="mt-auto pt-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
            {copy.reset.sideFooter}
          </p>
        </div>
      </aside>
    </main>
  );
}

function RequestStep({
  copy,
  locale,
  email,
  setEmail,
  onSubmit,
}: {
  copy: AuthCopy;
  locale: Locale;
  email: string;
  setEmail: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-5">
        {copy.reset.request.eyebrow}
      </p>
      <h1 className="text-[clamp(28px,3.6vw,36px)] font-medium tracking-[-0.025em] leading-[1.1] text-ink mb-3">
        {copy.reset.request.title}
      </h1>
      <p className="text-[14px] text-ink-muted leading-[1.6] mb-10">
        {copy.reset.request.body}
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
            {copy.common.email}
          </span>
          <input
            type="email"
            autoComplete="email"
            placeholder={copy.common.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors placeholder:text-ink-soft"
            required
          />
        </label>

        <button
          type="submit"
          className="mt-3 inline-flex items-center justify-center text-[13.5px] font-medium px-5 py-3 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
        >
          {copy.reset.request.submit}
        </button>
      </form>

      <p className="mt-7 text-[13px] text-ink-muted">
        {copy.reset.request.remember}{" "}
        <Link
          href={localizePath("/login", locale)}
          className="text-ink underline decoration-rule decoration-[1.5px] underline-offset-4 hover:decoration-ink/40 transition-colors"
        >
          {copy.reset.request.backLogin}
        </Link>
        .
      </p>

      <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft leading-relaxed">
        {copy.reset.request.sessionNote}
      </p>
    </>
  );
}

function SentStep({
  copy,
  locale,
  email,
  onChangeEmail,
}: {
  copy: AuthCopy;
  locale: Locale;
  email: string;
  onChangeEmail: () => void;
}) {
  return (
    <>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-5">
        {copy.reset.sent.eyebrow}
      </p>
      <h1 className="text-[clamp(28px,3.6vw,36px)] font-medium tracking-[-0.025em] leading-[1.1] text-ink mb-3">
        {copy.reset.sent.title}
      </h1>
      <p className="text-[14px] text-ink-muted leading-[1.6] mb-8">
        {copy.reset.sent.bodyPrefix} <span className="text-ink">{email}</span>.{" "}
        {copy.reset.sent.bodySuffix}
      </p>

      <div className="rounded-[12px] border border-rule bg-canvas-soft p-5 mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted mb-3">
          {copy.reset.sent.nextTitle}
        </p>
        <ol className="flex flex-col gap-2 text-[13px] text-ink leading-[1.55]">
          {copy.reset.sent.steps.map((item, index) => (
            <li key={item} className="flex gap-3">
              <span className="text-ink-soft font-mono text-[11px] tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href="https://mail.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center text-[13.5px] font-medium px-5 py-3 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
        >
          {copy.reset.sent.gmail}
        </a>
        <button
          type="button"
          onClick={onChangeEmail}
          className="flex-1 inline-flex items-center justify-center text-[13.5px] font-medium px-5 py-3 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
        >
          {copy.reset.sent.differentEmail}
        </button>
      </div>

      <div className="flex items-center justify-between mt-8 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
        <Link href={localizePath("/login", locale)} className="hover:text-ink transition-colors">
          {copy.reset.sent.backLoginArrow}
        </Link>
        <button type="button" className="hover:text-ink transition-colors">
          {copy.reset.sent.resend}
        </button>
      </div>
    </>
  );
}
