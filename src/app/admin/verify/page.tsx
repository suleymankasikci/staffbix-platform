"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { OtpForm } from "@/components/auth/OtpForm";

function VerifyInner() {
  const sp = useSearchParams();
  // The email param is no longer authoritative — the cookie is. We still
  // accept it as a hint so the side panel can show "Sent to ...".
  const email = sp.get("email") ?? "your staff email";

  return (
    <main className="min-h-screen flex flex-col md:grid md:grid-cols-2">
      <div className="flex flex-col px-6 md:px-12 lg:px-20 py-8 md:py-12">
        <header className="mb-auto">
          <Link href="/admin/login" className="inline-flex items-center gap-2 text-ink">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="shrink-0">
              <rect x="0" y="2" width="9" height="1.5" fill="currentColor" />
              <rect x="2.5" y="6.25" width="9" height="1.5" fill="currentColor" />
              <rect x="0" y="10.5" width="9" height="1.5" fill="currentColor" />
            </svg>
            <span className="text-[14px] font-medium tracking-[-0.01em]">Staffbix</span>
            <span className="ml-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#F97316] border border-[#F97316]/40 rounded px-1.5 py-0.5">
              Admin
            </span>
          </Link>
        </header>

        <div className="max-w-[400px] mx-auto md:mx-0 py-10 md:py-16 w-full">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-5">
            Step 2 of 2 · Verification
          </p>
          <h1 className="text-[clamp(28px,3.6vw,36px)] font-medium tracking-[-0.025em] leading-[1.1] text-ink mb-3">
            Enter your 6-digit code.
          </h1>
          <p className="text-[14px] text-ink-muted leading-[1.6] mb-10">
            Sent to <span className="text-ink">{email}</span>. Valid for 10 minutes.
          </p>

          <OtpForm
            scope="admin"
            copy={{
              submit: "Verify and sign in",
              back: "← Use different email",
              resend: "Resend code",
              resendSentNote: "Code resent. Check your inbox.",
              errors: {
                missingDigits: "Enter all six digits.",
                incorrectCode: "Incorrect code.",
                network: "Network problem. Try again.",
                resendFailed: "Couldn't resend. Try again in a minute.",
                verifying: "Verifying...",
                sending: "Sending...",
              },
            }}
          />

          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
            <Link href="/admin/login" className="hover:text-ink transition-colors">
              ← Use different email
            </Link>
          </p>

          <div className="mt-10 pt-6 border-t border-rule space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
              Failed attempts: 0 of 5 · Lockout for 15 min on threshold
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
              This login will appear in /admin/audit within 1 second
            </p>
          </div>
        </div>

        <footer className="mt-auto pt-10 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          <Link href="/admin/login" className="hover:text-ink transition-colors">
            ← Back
          </Link>
          <span>v1.0.0</span>
        </footer>
      </div>

      <aside className="hidden md:flex bg-[#0F1115] text-white/85 px-12 lg:px-20 py-12 flex-col">
        <div className="mb-auto">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/45">
            Security context
          </p>
        </div>
        <div className="max-w-[400px]">
          <h2 className="text-[24px] lg:text-[28px] font-medium tracking-[-0.025em] leading-[1.2] text-white mb-7">
            Your sign-in attempt
          </h2>
          <dl className="flex flex-col divide-y divide-white/10">
            <Row k="Email" v={email} />
            <Row k="IP" v="78.182.•••.118" />
            <Row k="Location" v="🇹🇷 Istanbul, Türkiye" />
            <Row k="Device" v="MacBook Pro · Chrome 124" />
            <Row k="Started" v="13 May 2026, 10:42 CET" />
          </dl>
        </div>
        <div className="mt-auto pt-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">
            If you didn&apos;t initiate this, email security@staffbix.com immediately.
          </p>
        </div>
      </aside>
    </main>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/45">{k}</dt>
      <dd className="text-[12.5px] text-white">{v}</dd>
    </div>
  );
}

export default function AdminVerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
