import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import {
  leads,
  workers,
  conversations,
  messages,
  type Lead,
} from "../db/schema";
import { chatReply } from "../ai/chat";
import { createPending, recordAuto } from "../approvals/runtime";

/**
 * SDR outreach pipeline.
 *
 * Given a lead, ask the worker to draft a personalized first-touch
 * email, persist the draft, and create a worker_action(kind='email_send')
 * for the Approval Center. The lead's status flips to 'queued' so a
 * second call doesn't re-draft the same lead.
 *
 * Each draft is its own conversation (channel='manual', external_id=
 * `lead:{leadId}`). Replies will land in a separate conversation
 * (channel='email') because they come in through the inbound webhook
 * — Sprint 11+ will reconcile the two via the lead's email.
 */

export class OutreachError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface OutreachArgs {
  tenantId: string;
  workerId: string;
  leadId: string;
  /** Free-form override of the worker's default outreach instruction. */
  promptOverride?: string;
}

export interface OutreachResult {
  lead: Lead;
  actionId: string;
  subject: string;
  conversationId: string;
}

export async function draftOutreachEmail(
  args: OutreachArgs,
): Promise<OutreachResult> {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, args.leadId), eq(leads.tenantId, args.tenantId)))
    .limit(1);
  if (!lead) throw new OutreachError("lead_not_found", "Lead not found", 404);

  if (lead.status === "unsubscribed" || lead.status === "bounced") {
    throw new OutreachError(
      "lead_unreachable",
      `Lead is ${lead.status}.`,
      409,
    );
  }

  const [worker] = await db
    .select()
    .from(workers)
    .where(and(eq(workers.id, args.workerId), eq(workers.tenantId, args.tenantId)))
    .limit(1);
  if (!worker) throw new OutreachError("worker_not_found", "Worker not found", 404);
  if (worker.status !== "active") {
    throw new OutreachError("worker_not_active", `Worker is ${worker.status}`, 409);
  }

  // One conversation per (lead, worker) outreach attempt. We append a
  // timestamp so a re-outreach later in the lead's life creates a new
  // conversation rather than mixing turns into the same row.
  const [convo] = await db
    .insert(conversations)
    .values({
      tenantId: args.tenantId,
      workerId: worker.id,
      channel: "manual",
      externalId: `lead:${lead.id}:${Date.now()}`,
      status: "open",
      customer: {
        source: "lead_outreach",
        leadId: lead.id,
        leadEmail: lead.email,
        leadName: lead.name,
      },
    })
    .returning();

  const userMessage = buildOutreachPrompt(lead, args.promptOverride);

  const result = await chatReply({
    context: {
      tenantId: args.tenantId,
      workerId: worker.id,
      workerName: worker.name,
      roleSlug: worker.roleSlug,
      customInstructions: worker.customInstructions,
      conversationId: convo.id,
      modelPin: worker.modelPin,
    },
    history: [],
    userMessage,
  });

  // Extract subject + body from the model's structured output.
  const { subject, body } = parseEmailDraft(result.text, lead);

  const [msgRow] = await db
    .insert(messages)
    .values({
      tenantId: args.tenantId,
      conversationId: convo.id,
      role: "assistant",
      content: body,
      citedChunkIds: result.citedChunkIds,
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      latencyMs: result.latencyMs,
    })
    .returning();

  const actionInput = {
    tenantId: args.tenantId,
    workerId: worker.id,
    conversationId: convo.id,
    draftMessageId: msgRow.id,
    kind: "email_send" as const,
    content: body,
    payload: {
      to: lead.email,
      subject,
      leadId: lead.id,
      replyTo: undefined as string | undefined,
    },
  };
  const action =
    worker.autonomy === "auto"
      ? await recordAuto(actionInput)
      : await createPending(actionInput);

  await db
    .update(leads)
    .set({ status: "queued", updatedAt: new Date() })
    .where(eq(leads.id, lead.id));

  return {
    lead,
    actionId: action.id,
    subject,
    conversationId: convo.id,
  };
}

function buildOutreachPrompt(lead: Lead, override?: string): string {
  const lines = [
    `Draft a short, personalized first-touch outreach email to a sales prospect.`,
    ``,
    `Recipient:`,
    `- Name: ${lead.name ?? "(unknown — open with a brief, warm greeting and avoid a name placeholder)"}`,
    `- Email: ${lead.email}`,
    lead.company ? `- Company: ${lead.company}` : "",
    lead.title ? `- Title: ${lead.title}` : "",
    lead.notes ? `- Notes: ${lead.notes}` : "",
    lead.tags.length > 0 ? `- Tags: ${lead.tags.join(", ")}` : "",
    ``,
    override ? `Brief: ${override}` : "Goal: open the conversation, ask one specific question they're likely to answer. NO call-to-buy, NO discount mention, NO calendar link.",
    ``,
    `Hard rules:`,
    `- Use the Brand Bible above for product facts. Never invent.`,
    `- Tone matches the brand voice.`,
    `- Under 120 words. 3-5 short paragraphs MAX.`,
    `- Do NOT include the recipient's email address in the body.`,
    `- Output format — return EXACTLY this and nothing else:`,
    ``,
    `SUBJECT: <one line>`,
    `<blank line>`,
    `<email body>`,
  ];
  return lines.filter((l) => l !== "").join("\n");
}

function parseEmailDraft(
  raw: string,
  lead: Lead,
): { subject: string; body: string } {
  const text = raw.trim();
  // Look for "SUBJECT: ..." on the first non-empty line.
  const m = /^subject:\s*(.+?)\s*$/im.exec(text);
  if (m) {
    const subject = m[1].slice(0, 200).trim();
    // Body starts after the SUBJECT line (and one optional blank line).
    const afterMatch = text.slice(m.index + m[0].length).replace(/^\s*\n/, "");
    const body = afterMatch.trim();
    if (body) return { subject, body };
  }
  // Fallback: model didn't comply with the format. Use the whole text
  // as body and synthesize a subject from the lead's company.
  return {
    subject: lead.company
      ? `Quick question about ${lead.company}`
      : "Quick question",
    body: text,
  };
}
