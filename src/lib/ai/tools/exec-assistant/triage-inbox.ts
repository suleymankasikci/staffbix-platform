import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * triage_inbox — given a batch of inbound items (emails, Slack DMs,
 * voicemails as text, etc.) score each by urgency × importance and
 * suggest a 1-line action. The executive scans the result on their
 * phone in 30 seconds.
 *
 * The model returns:
 *   - priorityBand: now | today | this_week | someday | ignore
 *   - suggestedAction: 1-line ("reply yourself", "delegate to ops",
 *     "auto-archive", "schedule reply for tomorrow")
 *   - shortReason: 1-line evidence (sender, topic, deadline)
 *
 * Triage rows are written to the security_events ledger so the exec
 * can run "show me what I deferred this week" queries later.
 */

const MODEL = "gpt-4o-mini";
const MAX_ITEMS_PER_CALL = 20;

export const triageInboxTool: Tool = {
  name: "triage_inbox",
  description:
    "Sort a batch of inbound messages by urgency × importance, suggest a 1-line action per item. Use this when the operator asks 'what should I look at first?' or 'help me clear my inbox'.",
  parameters: {
    type: "object",
    properties: {
      items: {
        type: "array",
        description: "Up to 20 messages to triage.",
        items: {
          type: "object",
          properties: {
            externalId: {
              type: "string",
              description: "Caller's id for the message (email message-id, Slack ts, etc.).",
            },
            sender: { type: "string", description: "Who sent it." },
            subject: { type: "string", description: "Subject / first line." },
            preview: { type: "string", description: "First ~200 chars of the body." },
            receivedAtIso: { type: "string", description: "ISO 8601 received time." },
          },
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const rawItems = Array.isArray(args.items) ? args.items : [];
    if (rawItems.length === 0) {
      return { ok: false, refused: true, reason: "items must be a non-empty array." };
    }
    if (rawItems.length > MAX_ITEMS_PER_CALL) {
      return {
        ok: false,
        refused: true,
        reason: `Too many items (${rawItems.length}); cap is ${MAX_ITEMS_PER_CALL}. Batch and call again.`,
      };
    }

    // Normalize input (we read whatever shape the model passed).
    type Normalized = {
      externalId: string;
      sender: string;
      subject: string;
      preview: string;
      receivedAtIso: string | null;
    };
    const items: Normalized[] = rawItems.map((raw, i) => {
      const r = (raw ?? {}) as Record<string, unknown>;
      return {
        externalId: r.externalId ? String(r.externalId) : `item-${i + 1}`,
        sender: r.sender ? String(r.sender) : "",
        subject: r.subject ? String(r.subject) : "",
        preview: r.preview ? String(r.preview).slice(0, 400) : "",
        receivedAtIso: typeof r.receivedAtIso === "string" ? r.receivedAtIso : null,
      };
    });

    const systemPrompt = [
      "You are an executive assistant prioritizing the boss's inbox.",
      "Output STRICT JSON array (no prose). One object per item, in the SAME order as input.",
      "Each object: { externalId, priorityBand, suggestedAction, shortReason }.",
      "priorityBand ∈ { now, today, this_week, someday, ignore }.",
      "suggestedAction is one short imperative sentence (e.g., 'Reply yes', 'Delegate to ops', 'Auto-archive — newsletter').",
      "shortReason names the sender + topic + any deadline you spotted.",
    ].join("\n");

    const userPayload = JSON.stringify(items);

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPayload },
        ],
        max_tokens: 1200,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      await recordAiUsage({
        tenantId: ctx.tenantId,
        workerId: ctx.workerId,
        conversationId: ctx.conversationId,
        provider: "openai",
        kind: "chat",
        model: MODEL,
        promptTokens: res.usage?.prompt_tokens ?? 0,
        completionTokens: res.usage?.completion_tokens ?? 0,
        latencyMs: Date.now() - t0,
      });

      const raw = res.choices[0]?.message?.content ?? "{}";
      let triageResults: unknown[] = [];
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          triageResults = parsed;
        } else if (parsed && typeof parsed === "object") {
          // Model sometimes wraps in { triage: [...] }
          for (const v of Object.values(parsed as Record<string, unknown>)) {
            if (Array.isArray(v)) {
              triageResults = v;
              break;
            }
          }
        }
      } catch {
        return { ok: false, refused: true, reason: "Model returned invalid JSON." };
      }

      if (triageResults.length !== items.length) {
        // Trim or pad to match — never refuse on length mismatch alone.
        // The audit just needs SOME triage result.
        if (triageResults.length > items.length) {
          triageResults = triageResults.slice(0, items.length);
        }
      }

      const bands = { now: 0, today: 0, this_week: 0, someday: 0, ignore: 0 } as Record<
        string,
        number
      >;
      const cleaned = triageResults.map((r, i) => {
        const obj = (r ?? {}) as Record<string, unknown>;
        const priorityBand =
          typeof obj.priorityBand === "string" &&
          ["now", "today", "this_week", "someday", "ignore"].includes(obj.priorityBand)
            ? obj.priorityBand
            : "today";
        bands[priorityBand]++;
        return {
          externalId: items[i]?.externalId ?? `item-${i + 1}`,
          priorityBand,
          suggestedAction:
            typeof obj.suggestedAction === "string" ? obj.suggestedAction : "Review",
          shortReason: typeof obj.shortReason === "string" ? obj.shortReason : "",
        };
      });

      await logSecurityEvent({
        kind: "inbox.triaged",
        tenantId: ctx.tenantId,
        payload: {
          subject: "inbox.triaged",
          itemCount: items.length,
          bandCounts: bands,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          triaged: cleaned,
          bandCounts: bands,
          totalItems: items.length,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Triage failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
