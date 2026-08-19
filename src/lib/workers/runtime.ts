import { and, eq, desc } from "drizzle-orm";
import { db } from "../db/client";
import {
  workers,
  conversations,
  messages,
  type Worker,
  type Conversation,
  type Message,
} from "../db/schema";
import { loadCatalogRole } from "../roles-server";
import { chatReply } from "../ai/chat";
import { createPending, recordAuto } from "../approvals/runtime";
import { checkWorkersCap, checkChannelsCap } from "../billing/limits";

/**
 * Worker lifecycle + conversation dispatch.
 *
 * `hireWorker` creates the DB row, validates the role slug against the
 * in-memory registry, and seeds default channels for the role.
 *
 * `dispatchInbound` is the entry point every channel (web widget,
 * WhatsApp, email — wired in Sprint 7) calls when a customer message
 * arrives. It finds-or-creates the conversation, runs the AI turn,
 * persists both messages, and returns the assistant reply.
 */

export class WorkerError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface HireArgs {
  tenantId: string;
  roleSlug: string;
  /** Display name override; falls back to the role's title. */
  name?: string;
  customInstructions?: string;
  channels?: string[];
  autonomy?: "auto" | "approve" | "suggest";
  settings?: Record<string, unknown>;
  modelPin?: string;
}

export async function hireWorker(args: HireArgs): Promise<Worker> {
  const role = await loadCatalogRole(args.roleSlug);
  if (!role) {
    throw new WorkerError("unknown_role", `Role '${args.roleSlug}' is not in the registry.`, 400);
  }
  if (role.status !== "available") {
    throw new WorkerError(
      "role_not_available",
      `Role '${args.roleSlug}' is not currently available for hire.`,
      400,
    );
  }

  // Duplicate-role pre-check. The DB has a UNIQUE (tenant_id, role_slug)
  // constraint that would catch this at INSERT time, but we surface it
  // here so the caller gets `already_hired` (409) instead of being
  // pushed onto the paywall when the tenant is also at their worker
  // cap. Re-hiring an existing role is not a quota-spending operation;
  // the user should be told to edit the existing worker.
  const [existing] = await db
    .select({ id: workers.id })
    .from(workers)
    .where(and(eq(workers.tenantId, args.tenantId), eq(workers.roleSlug, args.roleSlug)))
    .limit(1);
  if (existing) {
    throw new WorkerError(
      "already_hired",
      `This role is already hired for the tenant. Edit the existing worker instead.`,
      409,
    );
  }

  // Plan-limit enforcement — refuse the hire if the tenant is at their
  // worker cap. The UI shows the upgrade paywall when this fires.
  const capCheck = await checkWorkersCap({ tenantId: args.tenantId });
  if (!capCheck.ok) {
    throw new WorkerError("plan_limit_workers", capCheck.reason, 402);
  }

  const name = args.name?.trim() || role.title;
  // Canonicalize channel names to lowercase at the storage boundary.
  // The role registry uses display-cased strings ("Web", "Email") but
  // every downstream check (widget endpoint, WhatsApp dispatcher, …)
  // is case-insensitive on its inputs. Normalizing here means the DB
  // is always lowercase and the UI can title-case for display.
  const rawChannels =
    args.channels && args.channels.length > 0 ? args.channels : role.channels;
  const channels = rawChannels.map((c) => c.toLowerCase());

  // Channels-per-worker cap. Enforced server-side so the cap can't be
  // dodged by a custom client. Hit 402 with `plan_limit_channels`.
  const channelsCheck = await checkChannelsCap({
    tenantId: args.tenantId,
    channelCount: channels.length,
  });
  if (!channelsCheck.ok) {
    throw new WorkerError(
      "plan_limit_channels",
      channelsCheck.reason,
      402,
    );
  }

  try {
    const [row] = await db
      .insert(workers)
      .values({
        tenantId: args.tenantId,
        roleSlug: args.roleSlug,
        name,
        customInstructions: args.customInstructions?.trim() || null,
        channels,
        autonomy: args.autonomy ?? "approve",
        settings: args.settings ?? {},
        modelPin: args.modelPin ?? null,
      })
      .returning();
    return row;
  } catch (e: unknown) {
    const err = e as { cause?: { code?: string; constraint_name?: string } };
    if (
      err.cause?.code === "23505" &&
      err.cause?.constraint_name === "workers_tenant_role_unique"
    ) {
      throw new WorkerError(
        "already_hired",
        `This role is already hired for the tenant. Edit the existing worker instead.`,
        409,
      );
    }
    throw e;
  }
}

export async function loadWorker(args: {
  tenantId: string;
  workerId: string;
}): Promise<Worker | null> {
  const [row] = await db
    .select()
    .from(workers)
    .where(and(eq(workers.id, args.workerId), eq(workers.tenantId, args.tenantId)))
    .limit(1);
  return row ?? null;
}

export async function listWorkers(tenantId: string): Promise<Worker[]> {
  return db
    .select()
    .from(workers)
    .where(eq(workers.tenantId, tenantId))
    .orderBy(desc(workers.createdAt));
}

export async function updateWorker(args: {
  tenantId: string;
  workerId: string;
  patch: Partial<{
    name: string;
    customInstructions: string | null;
    channels: string[];
    autonomy: "auto" | "approve" | "suggest";
    settings: Record<string, unknown>;
    modelPin: string | null;
    status: "active" | "paused" | "terminated";
  }>;
}): Promise<Worker | null> {
  // Channels cap also applies when the operator edits an existing
  // worker — otherwise a user could hire on a stricter plan and then
  // attach more channels after the fact to dodge the cap.
  if (args.patch.channels) {
    const channelsCheck = await checkChannelsCap({
      tenantId: args.tenantId,
      channelCount: args.patch.channels.length,
    });
    if (!channelsCheck.ok) {
      throw new WorkerError(
        "plan_limit_channels",
        channelsCheck.reason,
        402,
      );
    }
  }
  const [row] = await db
    .update(workers)
    .set({ ...args.patch, updatedAt: new Date() })
    .where(and(eq(workers.id, args.workerId), eq(workers.tenantId, args.tenantId)))
    .returning();
  return row ?? null;
}

export async function deleteWorker(args: {
  tenantId: string;
  workerId: string;
}): Promise<boolean> {
  const rows = await db
    .delete(workers)
    .where(and(eq(workers.id, args.workerId), eq(workers.tenantId, args.tenantId)))
    .returning({ id: workers.id });
  return rows.length === 1;
}

/* ── Conversation flow ──────────────────────────────────────────────────── */

export interface DispatchArgs {
  tenantId: string;
  workerId: string;
  /** Channel-side conversation id (widget session, WhatsApp number, ...). */
  externalId: string;
  channel: "web" | "whatsapp" | "email" | "instagram" | "manual";
  userMessage: string;
  /** Optional customer identity hints — name, email, locale. */
  customer?: Record<string, unknown>;
}

export interface DispatchResult {
  conversation: Conversation;
  userMessage: Message;
  assistantMessage: Message;
  /**
   * The worker's autonomy at dispatch time. The widget endpoint reads
   * this to decide whether to stream the assistant message to the
   * customer (auto) or surface a "waiting on a teammate" placeholder
   * (approve/suggest).
   */
  autonomy: Worker["autonomy"];
  /**
   * Per-turn tool calls the model executed (Sprint 21+). Empty when
   * the role has no tools configured or the model didn't need them.
   * Audit script + Approval Center read this to surface "this AI
   * actually did X" rather than just "AI replied".
   */
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
    ok: boolean;
    refusedReason?: string;
  }>;
}

/**
 * Find-or-create the conversation, append the user message, run the AI
 * turn, append the assistant message. All four writes happen one after
 * the other; we don't wrap them in a transaction because the AI call
 * is long-running and holding a DB transaction open for that span is a
 * worse failure mode than the rare orphan-message risk.
 */
export async function dispatchInbound(args: DispatchArgs): Promise<DispatchResult> {
  const worker = await loadWorker({
    tenantId: args.tenantId,
    workerId: args.workerId,
  });
  if (!worker) throw new WorkerError("worker_not_found", "Worker not found.", 404);
  if (worker.status !== "active") {
    throw new WorkerError(
      "worker_not_active",
      `Worker is ${worker.status}.`,
      409,
    );
  }

  // Find or create the conversation
  let convo: Conversation;
  const existing = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.tenantId, args.tenantId),
        eq(conversations.workerId, args.workerId),
        eq(conversations.channel, args.channel),
        eq(conversations.externalId, args.externalId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    convo = existing[0];
  } else {
    const [created] = await db
      .insert(conversations)
      .values({
        tenantId: args.tenantId,
        workerId: args.workerId,
        channel: args.channel,
        externalId: args.externalId,
        customer: args.customer ?? null,
        status: "open",
      })
      .returning();
    convo = created;
  }

  // Insert user message
  const [userRow] = await db
    .insert(messages)
    .values({
      tenantId: args.tenantId,
      conversationId: convo.id,
      role: "user",
      content: args.userMessage,
    })
    .returning();

  // Load recent history (last 20 turns is plenty for a chat widget)
  const history = await db
    .select({
      role: messages.role,
      content: messages.content,
    })
    .from(messages)
    .where(eq(messages.conversationId, convo.id))
    .orderBy(desc(messages.createdAt))
    .limit(20);
  history.reverse();

  // Compose chat — tool-calling-aware. The chatReply runtime picks the
  // tool set from the role registry and runs an agentic loop (model →
  // tool_calls → tool execute → model again), so we just need to
  // surface the worker's channel/autonomy/settings here.
  const result = await chatReply({
    context: {
      tenantId: args.tenantId,
      workerId: worker.id,
      workerName: worker.name,
      roleSlug: worker.roleSlug,
      customInstructions: worker.customInstructions,
      conversationId: convo.id,
      modelPin: worker.modelPin,
      channel: args.channel,
      autonomy: worker.autonomy,
      workerSettings:
        typeof worker.settings === "object" && worker.settings !== null
          ? (worker.settings as Record<string, unknown>)
          : {},
    },
    history: history
      .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "human_agent")
      .map((m) => ({ role: m.role as "user" | "assistant" | "human_agent", content: m.content })),
    userMessage: args.userMessage,
  });

  // Insert assistant message (always — the row is the audit trail
  // regardless of whether the customer ends up seeing it).
  const [assistantRow] = await db
    .insert(messages)
    .values({
      tenantId: args.tenantId,
      conversationId: convo.id,
      role: "assistant",
      content: result.text,
      citedChunkIds: result.citedChunkIds,
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      latencyMs: result.latencyMs,
    })
    .returning();

  // Autonomy gate. PRD §1.5: every worker has one of three modes.
  // The runtime always persists the assistant message, then either
  // records an `auto` action + dispatches the side effect, or creates
  // a `pending` worker_action that the owner must approve before the
  // customer ever sees the reply.
  const isAutonomous = worker.autonomy === "auto";
  if (isAutonomous) {
    await recordAuto({
      tenantId: args.tenantId,
      workerId: worker.id,
      conversationId: convo.id,
      draftMessageId: assistantRow.id,
      kind: channelKind(args.channel),
      content: result.text,
    });
  } else {
    await createPending({
      tenantId: args.tenantId,
      workerId: worker.id,
      conversationId: convo.id,
      draftMessageId: assistantRow.id,
      kind: channelKind(args.channel),
      content: result.text,
    });
  }

  // Conversation activity-bump.
  // - In `auto` mode the reply is customer-visible immediately, so
  //   lastMessageAt advances now.
  // - In `approve` / `suggest` mode we still bump it because the OWNER
  //   sees the conversation in the inbox awaiting approval. The widget
  //   customer-visible cutoff is enforced separately at render time.
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date(), updatedAt: new Date() })
    .where(eq(conversations.id, convo.id));

  return {
    conversation: convo,
    userMessage: userRow,
    assistantMessage: assistantRow,
    autonomy: worker.autonomy,
    toolCalls: result.toolCalls,
  };
}

/**
 * Map our conversation channel enum onto the worker_action kind. Today
 * the mapping is 1:1 for `web` → `web_reply`. Other channels return the
 * matching kind so Sprint 7+ can plug in the dispatchers without
 * changing this function.
 */
function channelKind(
  channel: DispatchArgs["channel"],
): "web_reply" | "whatsapp_reply" | "email_send" | "social_post" {
  switch (channel) {
    case "web":
      return "web_reply";
    case "whatsapp":
      return "whatsapp_reply";
    case "email":
      return "email_send";
    case "instagram":
      // Instagram DMs route through the same outbound shape as WhatsApp
      // in Sprint 7 — both go via Meta Cloud API messaging.
      return "whatsapp_reply";
    case "manual":
      return "web_reply";
  }
}
