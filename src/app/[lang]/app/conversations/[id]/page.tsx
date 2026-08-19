"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { PageShell, Card, SectionTitle, Badge } from "@/components/app/PageShell";
import { IconArrowRight } from "@/components/Icons";
import { useLocale, useLocalizedPath } from "@/lib/i18n/client";
import { getConversationDetailCopy } from "@/lib/i18n/page-copy";

type UiMessage = {
  side: "customer" | "ai" | "human";
  author: string;
  body: string;
  time: string;
};

type ApiConversation = {
  id: string;
  channel: "web" | "whatsapp" | "email" | "instagram" | "manual";
  status: "open" | "awaiting_human" | "resolved" | "abandoned";
  customer: unknown;
  lastMessageAt: string | null;
  createdAt: string;
  workerId: string;
  workerName: string;
  workerRoleSlug: string;
};

type ApiMessage = {
  id: string;
  conversationId: string;
  role: "system" | "user" | "assistant" | "human_agent" | "tool";
  content: string;
  createdAt: string;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function readCustomer(raw: unknown, fallback: string): {
  name: string;
  initials: string;
  phone: string | null;
} {
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const name =
      (typeof obj.name === "string" && obj.name) ||
      (typeof obj.fullName === "string" && obj.fullName) ||
      (typeof obj.email === "string" && obj.email) ||
      (typeof obj.phone === "string" && obj.phone) ||
      fallback;
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const initials =
      parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : (parts[0]?.slice(0, 2) ?? "··").toUpperCase();
    const phone = typeof obj.phone === "string" ? obj.phone : null;
    return { name, initials, phone };
  }
  return { name: fallback, initials: "··", phone: null };
}

function toUiMessage(m: ApiMessage, workerName: string, customerName: string): UiMessage | null {
  if (m.role === "system" || m.role === "tool") return null;
  if (m.role === "user") {
    return { side: "customer", author: customerName, body: m.content, time: formatTime(m.createdAt) };
  }
  if (m.role === "assistant") {
    return { side: "ai", author: `${workerName} · AI`, body: m.content, time: formatTime(m.createdAt) };
  }
  // human_agent
  return { side: "human", author: "Human agent", body: m.content, time: formatTime(m.createdAt) };
}

export default function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const locale = useLocale();
  const href = useLocalizedPath();
  const copy = getConversationDetailCopy(locale);
  const [draft, setDraft] = useState("");
  const [conversation, setConversation] = useState<ApiConversation | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setLoadError(`Failed to load conversation (HTTP ${res.status}).`);
          return;
        }
        const data = (await res.json()) as {
          conversation: ApiConversation;
          messages: ApiMessage[];
        };
        if (cancelled) return;
        const cust = readCustomer(data.conversation.customer, copy.customer.name);
        setConversation(data.conversation);
        setMessages(
          (data.messages ?? [])
            .map((m) => toUiMessage(m, data.conversation.workerName, cust.name))
            .filter((m): m is UiMessage => m !== null),
        );
      } catch {
        if (!cancelled) setLoadError("Network error loading conversation.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, copy.customer.name]);

  function send(e: FormEvent) {
    e.preventDefault();
    setDraft("");
  }

  const customer = conversation
    ? readCustomer(conversation.customer, copy.customer.name)
    : { name: copy.customer.name, initials: copy.customer.initials, phone: null };

  return (
    <PageShell
      title={customer.name || copy.title}
      description={copy.description}
      crumbs={[
        { label: copy.crumbs.conversations, href: href("/app/conversations") },
        { label: `#${id.slice(-4)}` },
      ]}
      actions={
        <>
          <button
            type="button"
            className="inline-flex items-center text-[13px] font-medium px-3.5 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
          >
            {copy.actions.close}
          </button>
          <button
            type="button"
            className="inline-flex items-center text-[13px] font-medium px-3.5 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
          >
            {copy.actions.assign}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card padded={false} className="lg:col-span-2 flex flex-col max-h-[760px]">
          <div className="px-5 py-3 border-b border-rule flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
              {copy.thread.label} {copy.separator} {messages.length}{" "}
              {copy.thread.messages} {copy.separator} {copy.thread.started}
            </p>
            <Badge tone="ink">{copy.thread.status}</Badge>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
            {loading && (
              <p className="text-center text-[12px] text-ink-soft">…</p>
            )}
            {!loading && loadError && (
              <p className="text-center text-[12px] text-ink-muted">{loadError}</p>
            )}
            {!loading && !loadError && messages.length === 0 && (
              <p className="text-center text-[12px] text-ink-soft">
                {copy.thread.label}
              </p>
            )}
            {messages.map((m, i) => (
              <Bubble key={i} message={m} separator={copy.separator} />
            ))}
          </div>
          <form
            onSubmit={send}
            className="border-t border-rule p-4 flex items-end gap-2"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder={copy.thread.placeholder}
              className="flex-1 bg-transparent text-[13px] text-ink py-2 border border-rule rounded-md px-3 focus:border-ink focus:outline-none transition-colors resize-none placeholder:text-ink-soft"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors shrink-0"
            >
              {copy.actions.send}
              <IconArrowRight width={13} height={13} />
            </button>
          </form>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <SectionTitle label={copy.customer.title} />
            <div className="flex items-center gap-3 mb-4">
              <span className="size-10 rounded-full bg-tint/60 border border-rule flex items-center justify-center font-mono text-[11px] font-medium text-ink">
                {customer.initials}
              </span>
              <div>
                <p className="text-[14px] font-medium text-ink">
                  {customer.name}
                </p>
                <p className="text-[12px] text-ink-muted">
                  {customer.phone ?? copy.customer.phone}
                </p>
              </div>
            </div>
            <dl className="flex flex-col divide-y divide-rule">
              <Detail k={copy.customer.lifetimeValue} v="€812" />
              <Detail k={copy.customer.orders} v="4" />
              <Detail k={copy.customer.firstSeen} v={copy.customer.firstSeenValue} />
              <Detail k={copy.customer.language} v={copy.customer.languageValue} />
              <Detail
                k={copy.customer.status}
                v={<Badge tone="ink">{copy.customer.statusValue}</Badge>}
              />
            </dl>
          </Card>

          <Card>
            <SectionTitle label={copy.order.title} />
            <p className="text-[13px] font-medium text-ink mb-1">
              {copy.order.id}
            </p>
            <p className="text-[12px] text-ink-muted mb-3">
              {copy.order.item}
            </p>
            <ul className="flex flex-col gap-1 text-[12px] text-ink-muted">
              <li className="flex justify-between">
                <span>{copy.order.status}</span>
                <span className="text-ink">{copy.order.statusValue}</span>
              </li>
              <li className="flex justify-between">
                <span>{copy.order.reshipment}</span>
                <span className="text-accent">{copy.order.reshipmentValue}</span>
              </li>
              <li className="flex justify-between">
                <span>{copy.order.discount}</span>
                <span className="text-ink">{copy.order.discountValue}</span>
              </li>
            </ul>
            <Link
              href="#"
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink hover:text-ink-muted transition-colors"
            >
              {copy.order.open}
              <IconArrowRight width={12} height={12} />
            </Link>
          </Card>

          <Card>
            <SectionTitle label={copy.worker.title} />
            <div className="flex items-center gap-3">
              <span className="size-8 rounded-full bg-tint/60 border border-rule flex items-center justify-center font-mono text-[10px] font-medium text-ink">
                {copy.worker.initials}
              </span>
              <div>
                <p className="text-[13px] font-medium text-ink">
                  {conversation?.workerName ?? copy.worker.name}
                </p>
                <p className="text-[11.5px] text-ink-muted">
                  {copy.worker.role}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function Bubble({
  message,
  separator,
}: {
  message: UiMessage;
  separator: string;
}) {
  if (message.side === "human") {
    return (
      <div className="self-center max-w-[80%] w-full">
        <div className="border border-rule rounded-[10px] bg-tint/30 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-1.5">
            {message.author} {separator} {message.time}
          </p>
          <p className="text-[13px] text-ink leading-[1.55]">{message.body}</p>
        </div>
      </div>
    );
  }

  const isCustomer = message.side === "customer";
  return (
    <div className={`max-w-[80%] ${isCustomer ? "self-start" : "self-end"}`}>
      <p
        className={`font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft mb-1.5 ${
          isCustomer ? "text-left" : "text-right"
        }`}
      >
        {message.author} {separator} {message.time}
      </p>
      <div
        className={`px-4 py-2.5 rounded-[12px] text-[13.5px] leading-[1.55] ${
          isCustomer
            ? "bg-canvas-soft text-ink rounded-bl-sm"
            : "bg-ink text-white rounded-br-sm"
        }`}
      >
        {message.body}
      </div>
    </div>
  );
}

function Detail({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
        {k}
      </dt>
      <dd className="text-[12.5px] text-ink">{v}</dd>
    </div>
  );
}
