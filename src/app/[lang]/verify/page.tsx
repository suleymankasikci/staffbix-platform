"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { OtpForm } from "@/components/auth/OtpForm";
import { useLocale } from "@/lib/i18n/client";
import { getAuthCopy } from "@/lib/i18n/page-copy";
import { localizePath } from "@/lib/i18n/routing";

export default function VerifyPage() {
  const locale = useLocale();
  const copy = getAuthCopy(locale);

  return (
    <main className="min-h-screen flex flex-col px-6 md:px-10">
      <header className="py-7 md:py-9 flex items-center justify-between">
        <BrandLogo />
        <Link
          href={localizePath("/login", locale)}
          className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
        >
          {copy.verify.loginPrompt}{" "}
          <span className="text-ink">{copy.verify.loginCta}</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center py-10">
        <div className="w-full max-w-[440px]">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-5">
            {copy.verify.eyebrow}
          </p>
          <h1 className="text-[clamp(28px,3.6vw,36px)] font-medium tracking-[-0.025em] leading-[1.1] text-ink mb-3">
            {copy.verify.title}
          </h1>
          <p className="text-[14px] text-ink-muted leading-[1.6] mb-8">
            {copy.verify.bodyPrefix}{" "}
            <span className="text-ink">{copy.verify.codeLabel}</span>.{" "}
            {copy.verify.bodySuffix}
          </p>

          <OtpForm
            scope="app"
            copy={{
              submit: copy.verify.submit,
              back: copy.verify.wrongEmail,
              resend: copy.verify.resend,
              resendSentNote: copy.verify.sentAgain,
              errors: copy.login.otpErrors,
            }}
          />

          <div className="mt-10 pt-8 border-t border-rule">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-4">
              {copy.verify.inboxLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {copy.verify.providers.map((provider) => (
                <a
                  key={provider.label}
                  href={provider.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-[12.5px] font-medium px-3.5 py-1.5 rounded-full border border-rule text-ink-muted hover:text-ink hover:border-ink/25 transition-colors"
                >
                  {provider.label}
                </a>
              ))}
            </div>
          </div>

          <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft leading-relaxed">
            {copy.verify.validNote}
          </p>
        </div>
      </div>

      <footer className="py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft border-t border-rule">
        <Link href={localizePath("/", locale)} className="hover:text-ink transition-colors">
          {copy.common.backHome}
        </Link>
        <div className="flex items-center gap-4">
          <Link href={localizePath("/legal/privacy", locale)} className="hover:text-ink transition-colors">
            {copy.common.privacy}
          </Link>
          <Link href={localizePath("/legal/terms", locale)} className="hover:text-ink transition-colors">
            {copy.common.terms}
          </Link>
          <Link href={localizePath("/docs", locale)} className="hover:text-ink transition-colors">
            {copy.common.docs}
          </Link>
        </div>
      </footer>
    </main>
  );
}
