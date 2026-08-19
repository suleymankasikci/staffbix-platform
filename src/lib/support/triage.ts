import { openai } from "../ai/openai";
import { recordAiUsage } from "../ai/usage";

/**
 * Ticket triage classifier.
 *
 * Reads a ticket's subject + body, classifies priority (Critical /
 * High / Normal / Low), and returns a one-line reasoning blurb the UI
 * shows next to the priority badge.
 *
 * Priority semantics:
 *   - critical: customer reports outage / data loss / fraud / safety
 *   - high:     blocked from completing a purchase / heavy unhappiness
 *   - normal:   feature question, "how do I" support, status check
 *   - low:      informational, FYI, marketing reply, polite thank-you
 *
 * Sprint 9 hard-codes the prompt. Sprint 11 will pull the per-tenant
 * Brand Bible context for tenant-specific priority rules ("VIP
 * customers always high", "free-tier always normal", etc.).
 */

const MODEL = "gpt-4o-mini" as const;

export type Priority = "critical" | "high" | "normal" | "low";

export interface TriageResult {
  priority: Priority;
  reasoning: string;
  /** Optional tags the model attached (e.g. ["billing","refund"]). */
  tags: string[];
}

export interface TriageArgs {
  tenantId: string | null;
  workerId?: string | null;
  ticketId?: string | null;
  subject: string;
  body: string;
}

export async function classifyTicket(args: TriageArgs): Promise<TriageResult> {
  const subject = args.subject.slice(0, 200);
  const body = args.body.slice(0, 4_000);
  const systemPrompt = `You classify customer support tickets.

Priority levels:
- critical: outage, data loss, fraud, account takeover, safety, legal threat, payment failure that blocks revenue
- high: customer is blocked from completing a key action; angry customer; refund dispute; bug affecting many
- normal: how-to questions, feature requests, status checks, general support
- low: informational replies, thank-you messages, low-impact suggestions

Return ONLY strict JSON:
{ "priority": "critical"|"high"|"normal"|"low", "reasoning": string (≤ 200 chars), "tags": string[] (0-5 short tags) }`;

  const userMessage = `Subject: ${subject}\n\nBody:\n${body}`;

  const t0 = Date.now();
  let promptTokens = 0;
  let completionTokens = 0;
  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 300,
    });
    promptTokens = res.usage?.prompt_tokens ?? 0;
    completionTokens = res.usage?.completion_tokens ?? 0;
    const raw = res.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<TriageResult>;

    await recordAiUsage({
      tenantId: args.tenantId,
      workerId: args.workerId ?? null,
      provider: "openai",
      kind: "chat",
      model: MODEL,
      promptTokens,
      completionTokens,
      latencyMs: Date.now() - t0,
    });

    const priority = normalizePriority(parsed.priority);
    return {
      priority,
      reasoning:
        typeof parsed.reasoning === "string"
          ? parsed.reasoning.slice(0, 240)
          : "",
      tags: Array.isArray(parsed.tags)
        ? parsed.tags
            .filter((t): t is string => typeof t === "string")
            .map((t) => t.toLowerCase().slice(0, 40))
            .slice(0, 5)
        : [],
    };
  } catch (err) {
    const errorCode =
      (err as { code?: string; status?: number }).code ??
      String((err as { status?: number }).status ?? "unknown");
    await recordAiUsage({
      tenantId: args.tenantId,
      workerId: args.workerId ?? null,
      provider: "openai",
      kind: "chat",
      model: MODEL,
      promptTokens,
      completionTokens,
      latencyMs: Date.now() - t0,
      errorCode,
    });
    // Fall back to safe default — never block ticket ingestion on a
    // classifier failure.
    return {
      priority: "normal",
      reasoning: "auto-classified to normal (triage classifier failed)",
      tags: [],
    };
  }
}

function normalizePriority(p: unknown): Priority {
  if (p === "critical" || p === "high" || p === "normal" || p === "low") return p;
  return "normal";
}
