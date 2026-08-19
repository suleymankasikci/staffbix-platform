"use client";

import { useLocale } from "@/lib/i18n/client";
import { getHomeCopy } from "@/lib/i18n/home-copy";

type Status = "available" | "q3";

type Worker = {
  index: number;
  status: Status;
  x: number;
  y: number;
};

const WORKERS: Worker[] = [
  { index: 0, status: "available", x: 18, y: 22 },
  { index: 1, status: "available", x: 80, y: 18 },
  { index: 2, status: "available", x: 88, y: 56 },
  { index: 4, status: "available", x: 70, y: 86 },
  { index: 3, status: "available", x: 18, y: 78 },
  { index: 5, status: "q3", x: 8, y: 50 },
];

const MOBILE_WORKERS: Worker[] = [
  { index: 0, status: "available", x: 0, y: 0 },
  { index: 1, status: "available", x: 0, y: 0 },
  { index: 2, status: "available", x: 0, y: 0 },
  { index: 3, status: "available", x: 0, y: 0 },
];

export function HeroVisual() {
  const locale = useLocale();
  const copy = getHomeCopy(locale);

  return (
    <>
      <div className="sm:hidden">
        <MobileStack copy={copy} />
      </div>
      <div className="hidden sm:block">
        <Constellation copy={copy} />
      </div>
    </>
  );
}

function Constellation({ copy }: { copy: ReturnType<typeof getHomeCopy> }) {
  return (
    <div className="relative w-full max-w-[720px] mx-auto aspect-[5/3] md:aspect-[16/9]">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {WORKERS.map((w, i) => (
          <line
            key={i}
            x1="50"
            y1="50"
            x2={w.x}
            y2={w.y}
            stroke="var(--color-rule)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {WORKERS.map((w, i) => (
        <div
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${w.x}%`, top: `${w.y}%` }}
        >
          <WorkerCard label={copy.brandBible.readers[w.index]} status={w.status} />
        </div>
      ))}

      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: "50%", top: "50%" }}
      >
        <CenterCard copy={copy} />
      </div>

      <p className="absolute -bottom-2 left-0 right-0 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
        {copy.workforce.title}
      </p>
    </div>
  );
}

function MobileStack({ copy }: { copy: ReturnType<typeof getHomeCopy> }) {
  return (
    <div className="flex flex-col items-center gap-5 max-w-[400px] mx-auto">
      <CenterCard copy={copy} />
      <span className="block h-7 w-px bg-rule" aria-hidden />
      <div className="grid grid-cols-2 gap-2.5 w-full">
        {MOBILE_WORKERS.map((w) => (
          <WorkerCard
            key={w.index}
            label={copy.brandBible.readers[w.index]}
            status={w.status}
          />
        ))}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft mt-3 text-center">
        {copy.workforce.title}
      </p>
    </div>
  );
}

function WorkerCard({
  label,
  status,
}: {
  label: string;
  status: Status;
}) {
  return (
    <div className="bg-card border border-rule rounded-md px-2.5 py-1.5 flex items-center gap-1.5 whitespace-nowrap">
      <span
        className={`size-[5px] rounded-full shrink-0 ${
          status === "available" ? "bg-accent" : "bg-ink-soft"
        }`}
      />
      <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink">
        {label}
      </span>
    </div>
  );
}

function CenterCard({ copy }: { copy: ReturnType<typeof getHomeCopy> }) {
  return (
    <div className="bg-card border border-ink rounded-md px-3.5 py-2.5 flex flex-col items-start gap-1 whitespace-nowrap">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
        {"// BRAND BIBLE"}
      </span>
      <span className="text-[13px] font-medium text-ink leading-tight">
        {copy.brandBible.title}
      </span>
    </div>
  );
}
