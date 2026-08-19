"use client";

import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from "@/components/Icons";

export type PaginationCopy = {
  showing: string;
  of: string;
  perPage: string;
  previousPage: string;
  nextPage: string;
};

const DEFAULT_COPY: PaginationCopy = {
  showing: "Showing",
  of: "of",
  perPage: "Per page",
  previousPage: "Previous page",
  nextPage: "Next page",
};

export type PaginationProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  pageSizes?: readonly number[];
  total: number;
  sliceStart: number;
  sliceEnd: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  copy?: PaginationCopy;
};

export function Pagination({
  page,
  totalPages,
  pageSize,
  pageSizes = [10, 25, 50, 100],
  total,
  sliceStart,
  sliceEnd,
  onPageChange,
  onPageSizeChange,
  copy = DEFAULT_COPY,
}: PaginationProps) {
  const numbers = compactPageList(page, totalPages);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3 border-t border-rule">
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
        <span>
          {copy.showing}{" "}
          <span className="text-ink tabular-nums">
            {sliceStart + 1}–{sliceEnd}
          </span>{" "}
          {copy.of} <span className="text-ink tabular-nums">{total}</span>
        </span>
        <span className="text-ink-soft/60">·</span>
        <label className="inline-flex items-center gap-2">
          <span>{copy.perPage}</span>
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="appearance-none bg-card border border-rule rounded pl-2 pr-6 py-1 text-[11px] text-ink hover:border-ink/25 focus:border-ink focus:outline-none transition-colors"
            >
              {pageSizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <IconChevronDown
              className="absolute right-1 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none"
              width={10}
              height={10}
            />
          </div>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label={copy.previousPage}
          className="inline-flex items-center justify-center size-7 rounded-md border border-rule text-ink-muted hover:text-ink hover:border-ink/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <IconChevronLeft width={13} height={13} />
        </button>

        {numbers.map((n, i) =>
          n === "…" ? (
            <span
              key={`gap-${i}`}
              className="font-mono text-[11px] text-ink-soft px-1.5 select-none"
            >
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n)}
              aria-current={n === page ? "page" : undefined}
              className={`inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-md font-mono text-[11px] tabular-nums transition-colors ${
                n === page
                  ? "bg-ink text-white border border-ink"
                  : "border border-rule text-ink-muted hover:text-ink hover:border-ink/25"
              }`}
            >
              {n}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          aria-label={copy.nextPage}
          className="inline-flex items-center justify-center size-7 rounded-md border border-rule text-ink-muted hover:text-ink hover:border-ink/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <IconChevronRight width={13} height={13} />
        </button>
      </div>
    </div>
  );
}

function compactPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: (number | "…")[] = [];
  const add = (n: number) => out.push(n);
  add(1);
  if (current > 3) out.push("…");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) add(i);

  if (current < total - 2) out.push("…");
  add(total);
  return out;
}
