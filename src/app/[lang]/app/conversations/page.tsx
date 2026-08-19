"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageShell, Card, Badge } from "@/components/app/PageShell";
import { IconSearch, IconArrowRight } from "@/components/Icons";
import { useLocale, useLocalizedPath } from "@/lib/i18n/client";
import { getConversationsListCopy } from "@/lib/i18n/page-copy";

type UiChannel = "Web" | "WhatsApp" | "Email" | "IG" | "FB" | "Telegram";
type UiState = "Active" | "Waiting" | "Escalated" | "Closed";

type Conversation = {
  id: string;
  channel: UiChannel;
  customer: { initials: string; name: string };
  worker: string;
  lastMessage: string;
  unread: number;
  state: UiState;
  updated: string;
};

const CHANNELS = ["All", "Web", "WhatsApp", "Email", "IG", "FB", "Telegram"] as const;

type ApiConversation = {
  id: string;
  channel: "web" | "whatsapp" | "email" | "instagram" | "manual";
  status: "open" | "awaiting_human" | "resolved" | "abandoned";
  workerId: string;
  workerName: string;
  workerRoleSlug: string;
  customer: unknown;
  lastMessageAt: string | null;
  createdAt: string;
  lastMessageRole: string | null;
  lastMessageContent: string | null;
};

const CHANNEL_MAP: Record<ApiConversation["channel"], UiChannel> = {
  web: "Web",
  whatsapp: "WhatsApp",
  email: "Email",
  instagram: "IG",
  // Manual outbound has no native UI channel; surface as Email (the only
  // channel humans typically reach customers on outside the supported
  // integrations). Keeps the badge filterable instead of dropping rows.
  manual: "Email",
};

const STATE_MAP: Record<ApiConversation["status"], UiState> = {
  open: "Active",
  awaiting_human: "Escalated",
  resolved: "Closed",
  abandoned: "Waiting",
};

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function readCustomer(raw: unknown): { name: string; initials: string } {
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const name =
      (typeof obj.name === "string" && obj.name) ||
      (typeof obj.fullName === "string" && obj.fullName) ||
      (typeof obj.email === "string" && obj.email) ||
      (typeof obj.phone === "string" && obj.phone) ||
      "";
    if (name) return { name, initials: initialsFrom(name) };
  }
  return { name: "Anonymous", initials: "··" };
}

function formatUpdated(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diffSec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}

function transform(rows: ApiConversation[]): Conversation[] {
  return rows.map((r) => {
    const customer = readCustomer(r.customer);
    return {
      id: r.id,
      channel: CHANNEL_MAP[r.channel] ?? "Web",
      customer,
      worker: r.workerName,
      lastMessage: r.lastMessageContent ?? "",
      unread: 0,
      state: STATE_MAP[r.status] ?? "Active",
      updated: formatUpdated(r.lastMessageAt ?? r.createdAt),
    };
  });
}

export default function ConversationsListPage() {
  const locale = useLocale();
  const localize = useLocalizedPath();
  const copy = getConversationsListCopy(locale);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("All");
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/conversations", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setLoadError(`Failed to load conversations (HTTP ${res.status}).`);
          return;
        }
        const data = (await res.json()) as { conversations: ApiConversation[] };
        if (!cancelled) setConversations(transform(data.conversations ?? []));
      } catch {
        if (!cancelled) setLoadError("Network error loading conversations.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (channel !== "All" && c.channel !== channel) return false;
      if (q) {
        const needle = q.toLowerCase();
        if (
          !c.customer.name.toLowerCase().includes(needle) &&
          !c.lastMessage.toLowerCase().includes(needle)
        )
          return false;
      }
      return true;
    });
  }, [channel, conversations, q]);

  return (
    <PageShell
      title={copy.title}
      description={copy.description}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
        <div className="flex flex-wrap gap-1.5">
          {CHANNELS.map((c) => {
            const active = channel === c;
            const count =
              c === "All"
                ? conversations.length
                : conversations.filter((x) => x.channel === c).length;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setChannel(c)}
                className={`inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? "bg-ink text-white border-ink"
                    : "bg-card text-ink-muted border-rule hover:border-ink/30 hover:text-ink"
                }`}
              >
                {copy.channels[c]}
                <span
                  className={`font-mono text-[10px] ${
                    active ? "text-white/70" : "text-ink-soft"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="inline-flex items-center gap-2 border border-rule rounded-md px-3 h-9 bg-card min-w-[260px]">
          <IconSearch className="text-ink-soft shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={copy.searchPlaceholder}
            className="flex-1 bg-transparent text-[12.5px] text-ink placeholder:text-ink-soft border-0 focus:outline-none"
          />
        </div>
      </div>

      <Card padded={false}>
        <ul className="divide-y divide-rule">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                href={localize(`/app/conversations/${c.id}`)}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-canvas-soft/60 transition-colors"
              >
                <span className="size-9 rounded-full bg-tint/60 border border-rule flex items-center justify-center font-mono text-[10px] font-medium text-ink shrink-0">
                  {c.customer.initials}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-medium text-ink truncate">
                      {c.customer.name}
                    </span>
                    <Badge tone="neutral">{copy.channels[c.channel]}</Badge>
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
                      → {c.worker}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-ink-muted leading-[1.5] truncate">
                    {c.lastMessage}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
                    {c.updated}
                  </span>
                  {c.unread > 0 && (
                    <span className="font-mono text-[10px] text-white bg-accent rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      {c.unread}
                    </span>
                  )}
                  <Badge
                    tone={
                      c.state === "Escalated"
                        ? "ink"
                        : c.state === "Closed"
                        ? "neutral"
                        : "soft"
                    }
                  >
                    {copy.states[c.state]}
                  </Badge>
                </div>
                <IconArrowRight className="text-ink-soft shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
        {filtered.length === 0 && (
          <div className="text-center py-14 text-[13px] text-ink-muted">
            {loading ? "…" : loadError ?? copy.noMatches}
          </div>
        )}
      </Card>
    </PageShell>
  );
}
