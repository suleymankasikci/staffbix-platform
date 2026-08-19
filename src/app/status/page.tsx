import { headers } from "next/headers";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckResult = {
  ok: boolean;
  latencyMs: number;
  error?: string;
};

type HealthResponse = {
  ok: boolean;
  checks: {
    postgres: CheckResult;
    redis: CheckResult;
    stripe: CheckResult;
    openai: CheckResult;
    r2: CheckResult;
  };
  timestamp: string;
  version: string;
};

const SUBSYSTEMS: Array<{
  key: keyof HealthResponse["checks"];
  label: string;
  description: string;
}> = [
  {
    key: "postgres",
    label: "Postgres",
    description: "Primary tenant + workforce database.",
  },
  {
    key: "redis",
    label: "Redis",
    description: "Rate-limit, session, queue broker.",
  },
  {
    key: "stripe",
    label: "Stripe",
    description: "Billing, invoices, customer portal.",
  },
  {
    key: "openai",
    label: "OpenAI",
    description: "Chat + embeddings for AI workers.",
  },
  {
    key: "r2",
    label: "Cloudflare R2",
    description: "Brand Bible source + asset storage.",
  },
];

async function loadHealth(): Promise<HealthResponse | null> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  if (!host) return null;
  try {
    const res = await fetch(`${proto}://${host}/api/health`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as HealthResponse;
  } catch {
    return null;
  }
}

function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms}ms`;
}

function overallTone(health: HealthResponse | null): {
  label: string;
  className: string;
  dot: string;
} {
  if (!health) {
    return {
      label: "Unable to reach /api/health",
      className: "text-ink bg-canvas-soft border-rule",
      dot: "bg-ink-soft",
    };
  }
  if (health.ok) {
    return {
      label: "All systems operational",
      className: "text-accent-deep bg-accent/10 border-accent/30",
      dot: "bg-accent",
    };
  }
  const failedCount = Object.values(health.checks).filter(
    (c) => !c.ok,
  ).length;
  if (failedCount >= 3) {
    return {
      label: "Major outage",
      className: "text-red-700 bg-red-50 border-red-300",
      dot: "bg-red-500",
    };
  }
  return {
    label: "Partial degradation",
    className: "text-amber-800 bg-amber-50 border-amber-300",
    dot: "bg-amber-500",
  };
}

export default async function StatusPage() {
  const health = await loadHealth();
  const tone = overallTone(health);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-rule">
        <div className="max-w-[920px] mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink hover:text-ink-muted transition-colors"
          >
            Staffbix
          </Link>
          <Link
            href="/"
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
          >
            Back to site
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[920px] mx-auto px-6 md:px-10 py-12 md:py-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-3">
            System status
          </p>
          <h1 className="text-[clamp(28px,4vw,40px)] font-medium tracking-[-0.025em] leading-[1.1] text-ink mb-8">
            Staffbix platform health
          </h1>

          <div
            className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full border ${tone.className} mb-10`}
          >
            <span
              className={`size-2 rounded-full ${tone.dot}`}
              aria-hidden="true"
            />
            <span className="text-[13.5px] font-medium">{tone.label}</span>
          </div>

          <div className="bg-card border border-rule rounded-[12px] overflow-hidden">
            <div className="px-5 py-4 border-b border-rule flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                Subsystems
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                Latency
              </p>
            </div>
            <ul className="divide-y divide-rule">
              {SUBSYSTEMS.map((sub) => {
                const check = health?.checks[sub.key];
                const ok = check?.ok === true;
                return (
                  <li
                    key={sub.key}
                    className="px-5 py-4 flex items-start gap-4"
                  >
                    <span
                      className={`size-2 rounded-full mt-2 shrink-0 ${
                        !check
                          ? "bg-ink-soft"
                          : ok
                            ? "bg-accent"
                            : "bg-red-500"
                      }`}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-ink">
                        {sub.label}
                      </p>
                      <p className="text-[12.5px] text-ink-muted leading-[1.55] mt-0.5">
                        {sub.description}
                      </p>
                      {check && !ok && check.error && (
                        <p className="font-mono text-[11px] text-red-700 mt-1.5 break-all">
                          {check.error}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`font-mono text-[10px] uppercase tracking-[0.12em] ${
                          !check
                            ? "text-ink-soft"
                            : ok
                              ? "text-accent-deep"
                              : "text-red-600"
                        }`}
                      >
                        {!check ? "Unknown" : ok ? "Operational" : "Down"}
                      </p>
                      <p className="font-mono text-[11.5px] text-ink-muted mt-0.5 tabular-nums">
                        {check ? formatLatency(check.latencyMs) : "—"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <dl className="grid grid-cols-2 gap-px bg-rule rounded-[12px] border border-rule overflow-hidden mt-8">
            <div className="bg-card px-5 py-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                Last checked
              </dt>
              <dd className="text-[13px] text-ink mt-1.5 tabular-nums">
                {health
                  ? new Date(health.timestamp).toUTCString()
                  : "Unavailable"}
              </dd>
            </div>
            <div className="bg-card px-5 py-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                Build
              </dt>
              <dd className="font-mono text-[13px] text-ink mt-1.5">
                {health?.version ?? "unknown"}
              </dd>
            </div>
          </dl>

          <p className="text-[12px] text-ink-muted leading-[1.55] mt-8">
            This page is generated from a live probe of each subsystem and
            updates every time you reload. For deeper history or incident
            details, contact{" "}
            <a
              href="mailto:support@staffbix.com"
              className="text-ink underline decoration-rule decoration-[1.5px] underline-offset-4 hover:decoration-ink-muted"
            >
              support@staffbix.com
            </a>
            .
          </p>
        </div>
      </main>

      <footer className="border-t border-rule">
        <div className="max-w-[920px] mx-auto px-6 md:px-10 py-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          <span>© Staffbix</span>
          <Link href="/docs" className="hover:text-ink transition-colors">
            Docs
          </Link>
        </div>
      </footer>
    </div>
  );
}
