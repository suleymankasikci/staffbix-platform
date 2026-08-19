"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { Reveal } from "@/components/Reveal";
import { LoginForm } from "@/components/auth/LoginForm";
import { useLocale } from "@/lib/i18n/client";
import { getAuthCopy } from "@/lib/i18n/page-copy";
import { localizePath } from "@/lib/i18n/routing";

export default function LoginPage() {
  const locale = useLocale();
  const copy = getAuthCopy(locale);

  return (
    <main className="min-h-screen flex flex-col md:grid md:grid-cols-2">
      <div className="flex flex-col px-6 md:px-12 lg:px-20 py-8 md:py-12">
        <header className="mb-auto">
          <BrandLogo />
        </header>

        <Reveal>
          <div className="max-w-[400px] mx-auto md:mx-0 py-10 md:py-16 w-full">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-5">
              {copy.login.credentials.eyebrow}
            </p>
            <h1 className="text-[clamp(28px,3.6vw,36px)] font-medium tracking-[-0.025em] leading-[1.1] text-ink mb-3">
              {copy.login.credentials.title}
            </h1>
            <p className="text-[14px] text-ink-muted leading-[1.6] mb-10">
              {copy.login.credentials.body}
            </p>

            <LoginForm
              locale={locale}
              copy={{
                workEmail: copy.common.email,
                emailPlaceholder: copy.common.emailPlaceholder,
                password: copy.common.password,
                passwordPlaceholder: "••••••••••••",
                showPassword: copy.common.showPassword,
                hidePassword: copy.common.hidePassword,
                submit: copy.login.credentials.continue,
                errors: copy.login.errors,
              }}
            />

            <p className="mt-5 text-right">
              <Link
                href={localizePath("/reset", locale)}
                className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted hover:text-ink transition-colors"
              >
                {copy.login.credentials.forgot}
              </Link>
            </p>

            <p className="mt-7 text-[13px] text-ink-muted">
              {copy.login.credentials.newHere}{" "}
              <Link
                href={localizePath("/signup", locale)}
                className="text-ink underline decoration-rule decoration-[1.5px] underline-offset-4 hover:decoration-ink/40 transition-colors"
              >
                {copy.login.credentials.trial}
              </Link>
              .
            </p>

            <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft leading-relaxed">
              {copy.login.credentials.otpNote}
            </p>
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
            {copy.login.sideEyebrow}
          </p>
        </div>

        <Reveal delay={0.1}>
          <div className="max-w-[400px]">
            <h2 className="text-[28px] lg:text-[32px] font-medium tracking-[-0.025em] leading-[1.15] text-ink mb-8">
              {copy.login.sideTitle}
            </h2>
            <ul className="flex flex-col gap-4">
              {copy.login.perks.map((perk) => (
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
            {copy.login.sideFooter}
          </p>
        </div>
      </aside>
    </main>
  );
}
