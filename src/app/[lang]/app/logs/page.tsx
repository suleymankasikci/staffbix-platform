"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PageShell,
  Card,
  Badge,
} from "@/components/app/PageShell";
import {
  IconSearch,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from "@/components/Icons";
import {
  LOG_TYPES,
  formatLogTime,
  type LogEntry,
  type LogType,
} from "@/lib/audit-logs";
import { useLocale } from "@/lib/i18n/client";
import { getAppLogsCopy } from "@/lib/i18n/page-copy";

type LogsCopy = ReturnType<typeof getAppLogsCopy>;
type Range = "today" | "last7" | "last30" | "all";
const RANGES: Range[] = ["today", "last7", "last30", "all"];

const PAGE_SIZES = [10, 25, 50, 100] as const;
type PageSize = (typeof PAGE_SIZES)[number];

export default function LogsPage() {
  const locale = useLocale();
  const copy = getAppLogsCopy(locale);
  const [active, setActive] = useState<LogType | "all">("all");
  const [range, setRange] = useState<Range>("last7");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/logs?range=${range}&limit=500`, { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setLoadError(`Failed to load logs (HTTP ${res.status}).`);
          return;
        }
        const data = (await res.json()) as { logs: LogEntry[]; counts: Record<string, number> };
        if (!cancelled) {
          setLogs(data.logs ?? []);
          setCounts(data.counts ?? {});
          setLoadError(null);
        }
      } catch {
        if (!cancelled) setLoadError("Network error loading logs.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (active !== "all" && l.type !== active) return false;
      if (q) {
        const n = q.toLowerCase();
        const haystack = [
          l.actorName,
          l.action,
          l.target ?? "",
          l.ip,
          l.city,
          l.country,
          l.device,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(n)) return false;
      }
      return true;
    });
  }, [active, q, logs]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const sliceStart = (currentPage - 1) * pageSize;
  const sliceEnd = sliceStart + pageSize;
  const visible = filtered.slice(sliceStart, sliceEnd);

  function resetList() {
    setPage(1);
    setOpenId(null);
  }

  return (
    <PageShell
      title={copy.title}
      description={copy.description}
      actions={
        <>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
          >
            {copy.actions.exportCsv}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
          >
            {copy.actions.streamWebhook}
          </button>
        </>
      }
    >
      {/* Filter bar */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {LOG_TYPES.map((t) => {
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setActive(t.key);
                  resetList();
                }}
                className={`inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  isActive
                    ? "bg-ink text-white border-ink"
                    : "bg-card text-ink-muted border-rule hover:border-ink/30 hover:text-ink"
                }`}
              >
                {t.label}
                <span
                  className={`font-mono text-[10px] ${
                    isActive ? "text-white/70" : "text-ink-soft"
                  }`}
                >
                  {counts[t.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={range}
              onChange={(e) => {
                setRange(e.target.value as Range);
                resetList();
              }}
              className="appearance-none bg-card border border-rule rounded-md pl-3 pr-8 h-9 text-[12.5px] text-ink hover:border-ink/25 focus:border-ink focus:outline-none transition-colors"
            >
              {RANGES.map((r) => (
                <option key={r} value={r}>
                  {copy.ranges[r]}
                </option>
              ))}
            </select>
            <IconChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none"
              width={11}
              height={11}
            />
          </div>

          <div className="inline-flex items-center gap-2 border border-rule rounded-md px-3 h-9 bg-card flex-1 min-w-[240px] max-w-[420px]">
            <IconSearch className="text-ink-soft shrink-0" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                resetList();
              }}
              placeholder={copy.searchPlaceholder}
              className="flex-1 bg-transparent text-[12.5px] text-ink placeholder:text-ink-soft border-0 focus:outline-none"
            />
          </div>

          <div className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            {loading
              ? "…"
              : loadError ??
                `${filtered.length} ${copy.summary.of} ${logs.length} ${copy.summary.entries}`}
          </div>
        </div>
      </div>

      {/* Table */}
      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-canvas-soft/60 border-b border-rule text-left">
                <Th>{copy.table.time}</Th>
                <Th>{copy.table.actor}</Th>
                <Th>{copy.table.action}</Th>
                <Th>{copy.table.location}</Th>
                <Th>{copy.table.device}</Th>
                <Th>{copy.table.result}</Th>
                <Th>{""}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {visible.map((l) => {
                const t = formatLogTime(l.at);
                const isOpen = openId === l.id;
                return (
                  <FragmentRow
                    key={l.id}
                    log={l}
                    timeDate={t.date}
                    timeTime={t.time}
                    open={isOpen}
                    onToggle={() => setOpenId(isOpen ? null : l.id)}
                    copy={copy}
                  />
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-14 text-[13px] text-ink-muted">
              {copy.table.noMatches}
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            sliceStart={sliceStart}
            sliceEnd={Math.min(sliceEnd, filtered.length)}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              resetList();
            }}
            copy={copy}
          />
        )}
      </Card>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
        {copy.retention}
      </p>
    </PageShell>
  );
}

function Pagination({
  page,
  totalPages,
  pageSize,
  sliceStart,
  sliceEnd,
  total,
  onPageChange,
  onPageSizeChange,
  copy,
}: {
  page: number;
  totalPages: number;
  pageSize: PageSize;
  sliceStart: number;
  sliceEnd: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: PageSize) => void;
  copy: LogsCopy;
}) {
  // Build a compact page number list: show first, last, current ±1, with ellipsis gaps.
  const numbers = compactPageList(page, totalPages);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3 border-t border-rule">
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
        <span>
          {copy.pagination.showing}{" "}
          <span className="text-ink tabular-nums">
            {sliceStart + 1}–{sliceEnd}
          </span>{" "}
          {copy.pagination.of}{" "}
          <span className="text-ink tabular-nums">{total}</span>
        </span>
        <span className="text-ink-soft/60">·</span>
        <label className="inline-flex items-center gap-2">
          <span>{copy.pagination.perPage}</span>
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) =>
                onPageSizeChange(Number(e.target.value) as PageSize)
              }
              className="appearance-none bg-card border border-rule rounded pl-2 pr-6 py-1 text-[11px] text-ink hover:border-ink/25 focus:border-ink focus:outline-none transition-colors"
            >
              {PAGE_SIZES.map((s) => (
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
          aria-label={copy.pagination.previous}
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
          aria-label={copy.pagination.next}
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

function FragmentRow({
  log,
  timeDate,
  timeTime,
  open,
  onToggle,
  copy,
}: {
  log: LogEntry;
  timeDate: string;
  timeTime: string;
  open: boolean;
  onToggle: () => void;
  copy: LogsCopy;
}) {
  return (
    <>
      <tr
        className="hover:bg-canvas-soft/50 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <Td>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink tabular-nums">
              {timeTime}
            </p>
            <p className="font-mono text-[10px] text-ink-soft mt-0.5">
              {timeDate}
            </p>
          </div>
        </Td>
        <Td>
          <div className="flex items-center gap-2.5">
            <span
              className={`size-6 rounded-full border border-rule flex items-center justify-center font-mono text-[9px] font-medium shrink-0 ${
                log.actorKind === "ai"
                  ? "bg-tint/60 text-ink"
                  : log.actorKind === "system"
                  ? "bg-ink text-white"
                  : "bg-canvas-soft text-ink"
              }`}
            >
              {log.actorKind === "system"
                ? "•"
                : log.actorName
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] text-ink truncate">{log.actorName}</p>
              {log.actorMeta && (
                <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-soft mt-0.5">
                  {log.actorMeta}
                </p>
              )}
            </div>
          </div>
        </Td>
        <Td>
          <p className="text-[12.5px] text-ink leading-tight">{log.action}</p>
          {log.target && (
            <p className="text-[11.5px] text-ink-muted truncate max-w-[320px] mt-0.5">
              {log.target}
            </p>
          )}
        </Td>
        <Td>
          <div className="flex items-center gap-2">
            <span className="text-[13px] leading-none" aria-hidden>
              {log.flag}
            </span>
            <div>
              <p className="text-[12px] text-ink leading-tight">
                {log.city}
              </p>
              <p className="font-mono text-[10px] text-ink-soft mt-0.5">
                {log.country} {copy.separator} {log.ip}
              </p>
            </div>
          </div>
        </Td>
        <Td>
          <p className="text-[12px] text-ink leading-tight">{log.device}</p>
          <p className="font-mono text-[10px] text-ink-soft mt-0.5">
            {log.browser} {copy.separator} {log.language}
          </p>
        </Td>
        <Td>
          {log.result === "success" && (
            <Badge tone="accent">{copy.results.success}</Badge>
          )}
          {log.result === "blocked" && (
            <Badge tone="ink">{copy.results.blocked}</Badge>
          )}
          {log.result === "failed" && (
            <span className="inline-flex items-center font-mono text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded border bg-[#FEE2E2] text-[#B91C1C] border-[#B91C1C]/25">
              {copy.results.failed}
            </span>
          )}
        </Td>
        <Td>
          <IconChevronDown
            className={`text-ink-soft transition-transform ${
              open ? "rotate-180" : ""
            }`}
            width={12}
            height={12}
          />
        </Td>
      </tr>
      {open && (
        <tr className="bg-canvas-soft/40">
          <td colSpan={7} className="px-4 py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-3 max-w-[1100px]">
              <Detail k={copy.details.logId} v={<code className="font-mono text-[11px] text-ink">{log.id}</code>} />
              <Detail k={copy.details.type} v={log.type} />
              <Detail k={copy.details.actorKind} v={log.actorKind} />
              <Detail k={copy.details.ip} v={<code className="font-mono text-[11px] text-ink">{log.ip}</code>} />
              <Detail k={copy.details.city} v={log.city} />
              <Detail k={copy.details.region} v={log.region} />
              <Detail k={copy.details.country} v={`${log.flag} ${log.country} (${log.countryCode})`} />
              <Detail k={copy.details.device} v={log.device} />
              <Detail k={copy.details.browser} v={log.browser} />
              <Detail k={copy.details.language} v={log.language} />
              <Detail k={copy.details.result} v={log.result} />
              <Detail
                k={copy.details.timestamp}
                v={
                  <code className="font-mono text-[11px] text-ink">
                    {log.at}
                  </code>
                }
              />
            </div>
            {log.target && (
              <div className="mt-5 pt-4 border-t border-rule">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-1.5">
                  {copy.details.target}
                </p>
                <p className="text-[13px] text-ink">{log.target}</p>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft px-4 py-2.5 font-normal text-left">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
}

function Detail({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-1">
        {k}
      </p>
      <p className="text-[12.5px] text-ink leading-snug">{v}</p>
    </div>
  );
}
