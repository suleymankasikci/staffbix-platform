"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/PasswordField";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, scope: "admin" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Sign-in failed.");
        return;
      }
      router.push("/admin/verify");
    } catch {
      setError("Network problem. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col md:grid md:grid-cols-2">
      {/* Left — form */}
      <div className="flex flex-col px-6 md:px-12 lg:px-20 py-8 md:py-12">
        <header className="mb-auto flex items-center justify-between">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="shrink-0">
              <rect x="0" y="2" width="9" height="1.5" fill="currentColor" />
              <rect x="2.5" y="6.25" width="9" height="1.5" fill="currentColor" />
              <rect x="0" y="10.5" width="9" height="1.5" fill="currentColor" />
            </svg>
            <span className="text-[14px] font-medium tracking-[-0.01em]">
              Staffbix
            </span>
            <span className="ml-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#F97316] border border-[#F97316]/40 rounded px-1.5 py-0.5">
              Admin
            </span>
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            v1.0.0
          </span>
        </header>

        <div className="max-w-[400px] mx-auto md:mx-0 py-10 md:py-16 w-full">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#F97316] mb-5 inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#F97316]" />
            Staff access · Restricted
          </p>
          <h1 className="text-[clamp(28px,3.6vw,36px)] font-medium tracking-[-0.025em] leading-[1.1] text-ink mb-3">
            Sign in to admin.
          </h1>
          <form onSubmit={submit} className="flex flex-col gap-6 mt-2">
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                Staff email
              </span>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@staffbix.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors placeholder:text-ink-soft"
                required
              />
            </label>

            <PasswordField
              label="Password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              required
            />

            {error && (
              <p
                role="alert"
                className="text-[13px] text-[#B91C1C] bg-[#FEE2E2] border border-[#B91C1C]/25 rounded-md px-3 py-2"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-3 inline-flex items-center justify-center text-[13.5px] font-medium px-5 py-3 rounded-full bg-ink text-white hover:bg-ink/85 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Signing in..." : "Continue"}
            </button>
          </form>
        </div>

        <footer className="mt-auto pt-10 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          <Link href="/en" className="hover:text-ink transition-colors">
            ← Marketing site
          </Link>
          <Link href="/en/login" className="hover:text-ink transition-colors">
            Customer login →
          </Link>
        </footer>
      </div>

      {/* Right — dark security panel */}
      <aside className="hidden md:flex bg-[#0F1115] text-white/85 px-12 lg:px-20 py-12 flex-col">
        <div className="mb-auto">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/45">
            Platform health
          </p>
        </div>

        <div className="max-w-[400px]">
          <h2 className="text-[28px] lg:text-[32px] font-medium tracking-[-0.025em] leading-[1.15] text-white mb-8">
            12 tenants live.
            <br />
            Zero incidents this week.
          </h2>
          <ul className="flex flex-col gap-4">
            {[
              "All systems operational",
              "API p99 latency 186 ms",
              "0 cross-tenant access attempts",
              "1 staff session active right now",
              "Last deploy 4 hours ago · v1.0.0",
            ].map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span aria-hidden className="mt-[6px] block size-1.5 rounded-full bg-[#16A34A] shrink-0" />
                <span className="text-[13.5px] text-white/85 leading-[1.55]">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto pt-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">
            Status: status.staffbix.com · Incident response on-call: Devran A.
          </p>
        </div>
      </aside>
    </main>
  );
}
