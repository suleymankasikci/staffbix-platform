import { openai } from "./openai";
import { recordAiUsage } from "./usage";
import { searchBrandBible, type RetrievalHit } from "./retrieve";
import { loadCatalogRole } from "../roles-server";
import { checkAiSpendCap } from "../billing/limits";
import { toolsForRole } from "./tools/registry";
import { toOpenAI, validateArgs, type ToolContext } from "./tools/types";
import type { Locale } from "../i18n/config";

/**
 * Thrown when a chat call would exceed the tenant's monthly AI spend
 * cap. Route handlers map this to HTTP 402; the widget endpoint can
 * surface a "we'll get back to you when service resumes" message.
 */
export class AiSpendCapExceededError extends Error {
  readonly code = "plan_limit_ai_spend";
  readonly status = 402;
  readonly limit: number;
  readonly current: number;
  constructor(message: string, limit: number, current: number) {
    super(message);
    this.limit = limit;
    this.current = current;
  }
}

/**
 * Conversational AI for hired workers.
 *
 * Pipeline per inbound message:
 *   1. Retrieve top-k Brand Bible chunks for the user message
 *      (cosine + HNSW, already implemented in retrieve.ts).
 *   2. Compose a system prompt: role description + brand bible chunks +
 *      tenant's worker custom instructions + behavior rules.
 *   3. Call OpenAI chat completion (streaming).
 *   4. Stream tokens to the caller; once complete, record an `ai_usage`
 *      row and return the joined text + cited chunk ids.
 *
 * The function takes a *full* conversation history (user/assistant
 * messages), composes its own system message, and returns the new
 * assistant message. The caller is responsible for persisting messages
 * to the DB.
 */

const DEFAULT_MODEL = "gpt-4o-mini";

const SAFETY_RULES = `You are a hired AI worker on the Staffbix platform.

Hard rules — never violate these:
- Stay strictly inside the role you were hired for. Decline anything outside it politely.
- Only state facts that appear in the Brand Bible context above. If asked about something not in the context, say so honestly — never invent details (prices, hours, policies, product names).
- If the customer is angry, frustrated, or describing harm to themselves or others, set the conversation status to "awaiting_human" and tell them a teammate will follow up.
- Respect the tone instructions the owner gave you. If those conflict with these hard rules, the hard rules win.
- Do not reveal that you are an AI unless the customer asks directly. Be a helpful person, not a personality-quirk-prone bot.
- Never make commitments you cannot honor (discounts, refunds, escalations) — say "I'll check with the team and circle back" and stop.`;

export interface ChatTurn {
  role: "user" | "assistant" | "human_agent";
  content: string;
}

export interface ChatContext {
  tenantId: string;
  workerId: string;
  workerName: string;
  /** Role slug from `src/lib/roles.ts`. */
  roleSlug: string;
  /** Tenant-provided extra system-prompt notes. May be empty. */
  customInstructions: string | null;
  conversationId: string;
  /** Optional model override on the worker. */
  modelPin?: string | null;
  /** Channel the customer wrote in on — passed to tool ctx so tools
   *  know how to phrase escalations. Optional for back-compat with
   *  older callers; defaults to "web" inside the runtime. */
  channel?: "web" | "whatsapp" | "email" | "instagram" | "manual";
  /** Worker autonomy mode — gates whether write-side tools fire.
   *  Defaults to "approve" if omitted. */
  autonomy?: "auto" | "approve" | "suggest";
  /** Customer locale (for tool result formatting). Defaults to "en". */
  locale?: Locale;
  /** Per-worker JSON settings: refundAuth, etc. Defaults to {}. */
  workerSettings?: Record<string, unknown>;
}

export interface ChatResult {
  /** The assistant's reply, fully assembled. */
  text: string;
  /** chunkId of every Brand Bible chunk fed into the system prompt. */
  citedChunkIds: string[];
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  /** Tools the model invoked during this turn (name + arg summary +
   *  ok/refused outcome). Surfaced in the audit trail + diagnostics. */
  toolCalls: Array<{
    name: string;
    args: Record<string, unknown>;
    ok: boolean;
    refusedReason?: string;
  }>;
}

/** Hard ceiling on tool-call iterations within a single turn.
 *  Protects against pathological loops where the model keeps calling
 *  tools without ever returning text. */
const MAX_TOOL_ITERATIONS = 4;

/**
 * Run one chat turn. Non-streaming — returns the full reply once the
 * upstream finishes. SSE streaming variant lives in
 * `streamChatReply()` below.
 */
export async function chatReply(args: {
  context: ChatContext;
  history: ChatTurn[];
  /** The current inbound user message — last item of `history` is the same. */
  userMessage: string;
}): Promise<ChatResult> {
  const { context, history, userMessage } = args;

  // Plan-limit gate. We refuse the call before incurring any tokens
  // when the tenant is over their monthly AI spend cap.
  const capCheck = await checkAiSpendCap({ tenantId: context.tenantId });
  if (!capCheck.ok) {
    throw new AiSpendCapExceededError(
      capCheck.reason,
      capCheck.limit,
      capCheck.current,
    );
  }

  const hits = await searchBrandBible({
    tenantId: context.tenantId,
    query: userMessage,
    k: 6,
    workerId: context.workerId,
    conversationId: context.conversationId,
  });

  const systemPrompt = await composeSystemPrompt(context, hits);
  const model = context.modelPin ?? DEFAULT_MODEL;
  const roleTools = toolsForRole(context.roleSlug);
  const toolsOpenAI =
    roleTools.length > 0 ? roleTools.map((t) => toOpenAI(t)) : undefined;

  const t0 = Date.now();
  let promptTokens = 0;
  let completionTokens = 0;
  let errorCode: string | null = null;
  const toolCalls: ChatResult["toolCalls"] = [];

  // Running message buffer — starts with system + history + user, and
  // grows with assistant turns + tool results as the agentic loop runs.
  // Type kept loose (any) to accommodate OpenAI's union of message
  // shapes (function role with tool_call_id etc.).
  const messages = buildChatMessages(systemPrompt, history, userMessage) as Array<
    Record<string, unknown>
  >;

  try {
    let iteration = 0;
    let finalText = "";

    while (iteration < MAX_TOOL_ITERATIONS) {
      iteration++;
      const res = await openai.chat.completions.create({
        model,
        // `messages` is widened to Record<string, unknown>[] inside the
        // tool loop to accommodate role='tool' + tool_call_id fields the
        // SDK's discriminated union doesn't expose cleanly when the
        // shape is built dynamically. The SDK validates at runtime.
        messages: messages as unknown as Parameters<typeof openai.chat.completions.create>[0]["messages"],
        max_tokens: 700,
        temperature: 0.4,
        ...(toolsOpenAI ? { tools: toolsOpenAI, tool_choice: "auto" } : {}),
      });

      promptTokens += res.usage?.prompt_tokens ?? 0;
      completionTokens += res.usage?.completion_tokens ?? 0;

      const message = res.choices[0]?.message;
      const wantTools = message?.tool_calls && message.tool_calls.length > 0;

      if (!wantTools) {
        finalText = message?.content ?? "";
        break;
      }

      // Persist the assistant's tool_calls turn before we feed back
      // the results — OpenAI requires the assistant message that
      // contains tool_calls to remain in the conversation.
      messages.push({
        role: "assistant",
        content: message?.content ?? null,
        tool_calls: message?.tool_calls,
      });

      // Execute each requested tool, appending one tool-result message
      // per call. Multiple parallel tool calls are common — handle them
      // in order, no early exit.
      for (const call of message?.tool_calls ?? []) {
        if (call.type !== "function") continue;
        const tool = roleTools.find((t) => t.name === call.function.name);
        const callRecord: ChatResult["toolCalls"][number] = {
          name: call.function.name,
          args: {},
          ok: false,
        };

        let resultMessage: string;
        if (!tool) {
          callRecord.refusedReason = "unknown_tool";
          resultMessage = JSON.stringify({
            error: `Unknown tool: ${call.function.name}`,
          });
        } else {
          let rawArgs: unknown;
          try {
            rawArgs = JSON.parse(call.function.arguments || "{}");
          } catch {
            callRecord.refusedReason = "malformed_json";
            resultMessage = JSON.stringify({
              error: "Tool arguments were not valid JSON.",
            });
            toolCalls.push(callRecord);
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: resultMessage,
            });
            continue;
          }
          const validated = validateArgs(tool.parameters, rawArgs);
          if (!validated.ok) {
            callRecord.refusedReason = validated.error;
            resultMessage = JSON.stringify({ error: validated.error });
          } else {
            callRecord.args = validated.args;
            const toolCtx: ToolContext = {
              tenantId: context.tenantId,
              workerId: context.workerId,
              conversationId: context.conversationId,
              channel: context.channel ?? "web",
              autonomy: context.autonomy ?? "approve",
              locale: context.locale ?? "en",
              workerSettings: context.workerSettings ?? {},
            };
            const execResult = await tool.execute(validated.args, toolCtx);
            if (execResult.ok) {
              callRecord.ok = true;
              resultMessage = JSON.stringify(execResult.data);
            } else {
              callRecord.refusedReason = execResult.reason;
              resultMessage = JSON.stringify({ refused: true, reason: execResult.reason });
            }
          }
        }

        toolCalls.push(callRecord);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: resultMessage,
        });
      }
    }

    if (iteration === MAX_TOOL_ITERATIONS && !finalText) {
      finalText =
        "I checked a couple of things but I want to be careful — let me get a teammate to follow up so you get a clear answer.";
    }

    const latencyMs = Date.now() - t0;

    await recordAiUsage({
      tenantId: context.tenantId,
      workerId: context.workerId,
      conversationId: context.conversationId,
      provider: "openai",
      kind: "chat",
      model,
      promptTokens,
      completionTokens,
      latencyMs,
    });

    return {
      text: finalText,
      citedChunkIds: hits.map((h) => h.chunkId),
      model,
      promptTokens,
      completionTokens,
      latencyMs,
      toolCalls,
    };
  } catch (err) {
    errorCode =
      (err as { code?: string; status?: number }).code ??
      String((err as { status?: number }).status ?? "unknown");
    await recordAiUsage({
      tenantId: context.tenantId,
      workerId: context.workerId,
      conversationId: context.conversationId,
      provider: "openai",
      kind: "chat",
      model,
      promptTokens,
      completionTokens,
      latencyMs: Date.now() - t0,
      errorCode,
    });
    throw err;
  }
}

/**
 * Streaming variant. Yields chunks as they arrive. After the loop
 * completes, the returned promise resolves with the final aggregate.
 *
 * Caller pattern:
 *   const { stream, done } = streamChatReply({ ... });
 *   for await (const chunk of stream) { write(chunk); }
 *   const result = await done; // resolved with the final ChatResult
 */
export function streamChatReply(args: {
  context: ChatContext;
  history: ChatTurn[];
  userMessage: string;
}): { stream: AsyncIterable<string>; done: Promise<ChatResult> } {
  const { context, history, userMessage } = args;

  let resolveDone!: (v: ChatResult) => void;
  let rejectDone!: (e: unknown) => void;
  const done = new Promise<ChatResult>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });

  async function* iterator(): AsyncGenerator<string> {
    // Plan-limit gate — same as the non-streaming variant. Throws
    // AiSpendCapExceededError when the tenant is over their cap.
    const capCheck = await checkAiSpendCap({ tenantId: context.tenantId });
    if (!capCheck.ok) {
      throw new AiSpendCapExceededError(
        capCheck.reason,
        capCheck.limit,
        capCheck.current,
      );
    }

    const hits = await searchBrandBible({
      tenantId: context.tenantId,
      query: userMessage,
      k: 6,
      workerId: context.workerId,
      conversationId: context.conversationId,
    });
    const systemPrompt = await composeSystemPrompt(context, hits);
    const model = context.modelPin ?? DEFAULT_MODEL;

    const roleTools = toolsForRole(context.roleSlug);
    const toolsOpenAI =
      roleTools.length > 0 ? roleTools.map((t) => toOpenAI(t)) : undefined;

    const t0 = Date.now();
    let promptTokens = 0;
    let completionTokens = 0;
    let assembled = "";
    const toolCalls: ChatResult["toolCalls"] = [];

    // Running message buffer — starts with system + history + user and
    // grows with assistant tool-call turns + tool results, identical to
    // the non-streaming chatReply agentic loop.
    const messages = buildChatMessages(systemPrompt, history, userMessage) as Array<
      Record<string, unknown>
    >;

    try {
      let iteration = 0;
      while (iteration < MAX_TOOL_ITERATIONS) {
        iteration++;
        const upstream = await openai.chat.completions.create({
          model,
          stream: true,
          stream_options: { include_usage: true },
          messages: messages as unknown as Parameters<
            typeof openai.chat.completions.create
          >[0]["messages"],
          max_tokens: 700,
          temperature: 0.4,
          ...(toolsOpenAI ? { tools: toolsOpenAI, tool_choice: "auto" } : {}),
        });

        // Under tool_choice:auto a single turn either answers (content)
        // or calls tools — the two don't interleave. So we can yield
        // content deltas live; if the turn turns out to be a tool-call
        // turn, no content was emitted. tool_calls arrive as indexed
        // fragments we reassemble here.
        let turnContent = "";
        const assembling = new Map<
          number,
          { id: string; name: string; args: string }
        >();

        for await (const chunk of upstream) {
          const choice = chunk.choices[0];
          const delta = choice?.delta?.content ?? "";
          if (delta) {
            turnContent += delta;
            assembled += delta;
            yield delta;
          }
          for (const tc of choice?.delta?.tool_calls ?? []) {
            const idx = tc.index ?? 0;
            const cur = assembling.get(idx) ?? { id: "", name: "", args: "" };
            if (tc.id) cur.id = tc.id;
            if (tc.function?.name) cur.name += tc.function.name;
            if (tc.function?.arguments) cur.args += tc.function.arguments;
            assembling.set(idx, cur);
          }
          if (chunk.usage) {
            promptTokens += chunk.usage.prompt_tokens ?? 0;
            completionTokens += chunk.usage.completion_tokens ?? 0;
          }
        }

        const assembledCalls = [...assembling.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, v]) => v)
          .filter((v) => v.name.length > 0);

        // No tool calls → this turn IS the final answer, already streamed.
        if (assembledCalls.length === 0) break;

        // Persist the assistant tool-call turn before feeding results.
        messages.push({
          role: "assistant",
          content: turnContent || null,
          tool_calls: assembledCalls.map((c) => ({
            id: c.id,
            type: "function",
            function: { name: c.name, arguments: c.args || "{}" },
          })),
        });

        // Execute each requested tool, appending one tool-result message
        // per call — same validation + ToolContext as chatReply.
        for (const call of assembledCalls) {
          const tool = roleTools.find((t) => t.name === call.name);
          const callRecord: ChatResult["toolCalls"][number] = {
            name: call.name,
            args: {},
            ok: false,
          };
          let resultMessage: string;
          if (!tool) {
            callRecord.refusedReason = "unknown_tool";
            resultMessage = JSON.stringify({
              error: `Unknown tool: ${call.name}`,
            });
          } else {
            let rawArgs: unknown;
            try {
              rawArgs = JSON.parse(call.args || "{}");
            } catch {
              callRecord.refusedReason = "malformed_json";
              resultMessage = JSON.stringify({
                error: "Tool arguments were not valid JSON.",
              });
              toolCalls.push(callRecord);
              messages.push({
                role: "tool",
                tool_call_id: call.id,
                content: resultMessage,
              });
              continue;
            }
            const validated = validateArgs(tool.parameters, rawArgs);
            if (!validated.ok) {
              callRecord.refusedReason = validated.error;
              resultMessage = JSON.stringify({ error: validated.error });
            } else {
              callRecord.args = validated.args;
              const toolCtx: ToolContext = {
                tenantId: context.tenantId,
                workerId: context.workerId,
                conversationId: context.conversationId,
                channel: context.channel ?? "web",
                autonomy: context.autonomy ?? "approve",
                locale: context.locale ?? "en",
                workerSettings: context.workerSettings ?? {},
              };
              const execResult = await tool.execute(validated.args, toolCtx);
              if (execResult.ok) {
                callRecord.ok = true;
                resultMessage = JSON.stringify(execResult.data);
              } else {
                callRecord.refusedReason = execResult.reason;
                resultMessage = JSON.stringify({
                  refused: true,
                  reason: execResult.reason,
                });
              }
            }
          }
          toolCalls.push(callRecord);
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: resultMessage,
          });
        }
        // loop continues → next turn streams (likely the final answer)
      }

      // Exhausted the tool-iteration ceiling without ever producing a
      // plain-text answer — emit the same safe close as chatReply.
      if (!assembled) {
        const fallback =
          "I checked a couple of things but I want to be careful — let me get a teammate to follow up so you get a clear answer.";
        assembled = fallback;
        yield fallback;
      }

      const latencyMs = Date.now() - t0;
      await recordAiUsage({
        tenantId: context.tenantId,
        workerId: context.workerId,
        conversationId: context.conversationId,
        provider: "openai",
        kind: "chat",
        model,
        promptTokens,
        completionTokens,
        latencyMs,
      });

      resolveDone({
        text: assembled,
        citedChunkIds: hits.map((h) => h.chunkId),
        model,
        promptTokens,
        completionTokens,
        latencyMs,
        toolCalls,
      });
    } catch (err) {
      const errorCode =
        (err as { code?: string; status?: number }).code ??
        String((err as { status?: number }).status ?? "unknown");
      await recordAiUsage({
        tenantId: context.tenantId,
        workerId: context.workerId,
        conversationId: context.conversationId,
        provider: "openai",
        kind: "chat",
        model,
        promptTokens,
        completionTokens,
        latencyMs: Date.now() - t0,
        errorCode,
      });
      rejectDone(err);
      throw err;
    }
  }

  return { stream: iterator(), done };
}

/**
 * Build the OpenAI `messages` array.
 *
 * The chat completion API only knows "user" / "assistant" / "system":
 *   - history's `human_agent` → "assistant" (same outbound side)
 *   - the live `userMessage` is appended as the final "user" turn
 *
 * If the caller already includes the userMessage at the tail of
 * `history` (e.g. dispatchInbound, which loads it back out of the DB
 * after persisting the user row), we de-dupe so the model doesn't see
 * the same message twice. The dedup compares both role and content.
 */
function buildChatMessages(
  systemPrompt: string,
  history: ChatTurn[],
  userMessage: string,
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const out: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];
  for (const m of history) {
    out.push({
      role: m.role === "human_agent" ? "assistant" : m.role,
      content: m.content,
    });
  }
  const last = out[out.length - 1];
  if (!last || last.role !== "user" || last.content !== userMessage) {
    out.push({ role: "user", content: userMessage });
  }
  return out;
}

async function composeSystemPrompt(
  ctx: ChatContext,
  hits: RetrievalHit[],
): Promise<string> {
  const role = await loadCatalogRole(ctx.roleSlug);
  const roleLine = role
    ? `You are ${ctx.workerName}, a ${role.title}. ${role.summary}`
    : `You are ${ctx.workerName}, a ${ctx.roleSlug.replace(/-/g, " ")}.`;

  const brandBibleBlock =
    hits.length > 0
      ? `Brand Bible context (cite only from here for facts):\n\n` +
        hits
          .map((h, i) => `[${i + 1}] (${h.sourceTitle})\n${h.content}`)
          .join("\n\n---\n\n")
      : "Brand Bible context: (none available — say you'll check with the team if asked about specifics)";

  const customBlock = ctx.customInstructions
    ? `\n\nOwner notes for this worker:\n${ctx.customInstructions}`
    : "";

  return [roleLine, "", brandBibleBlock + customBlock, "", SAFETY_RULES].join("\n");
}
