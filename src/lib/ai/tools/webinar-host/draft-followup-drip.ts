import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * draft_webinar_followup_drip — produce a 3-email post-event drip
 * tailored to either 'attended' or 'no_show' registrants. Each email:
 *   - delayHours: when to send relative to event end
 *   - subject, body, ctaAngle
 *   - replayLinkPlaceholder (the operator's link, verbatim)
 *
 * Output also includes a unsubscribeNote required by GDPR.
 */

const MODEL = "gpt-4o-mini";
const COHORTS = ["attended", "no_show"] as const;

const MIN_TAKEAWAYS = 1;
const MAX_TAKEAWAYS = 8;

export const draftWebinarFollowupDripTool: Tool = {
  name: "draft_webinar_followup_drip",
  description:
    "Draft a 3-email post-event drip for 'attended' or 'no_show' registrants. Each email has a delayHours + subject + body + CTA. Uses the operator's replay link placeholder verbatim.",
  parameters: {
    type: "object",
    properties: {
      webinarTitle: { type: "string" },
      cohort: { type: "string", enum: COHORTS },
      keyTakeaways: {
        type: "array",
        description: "1-8 short bullets the host wants reinforced.",
        items: { type: "string" },
      },
      replayLinkPlaceholder: {
        type: "string",
        description: "Replay link or placeholder (e.g., '<replay_link>'). Used verbatim.",
      },
      nextStepsLinkPlaceholder: {
        type: "string",
        description: "Optional 'book a call' / 'try the product' link placeholder.",
      },
    },
    required: ["webinarTitle", "cohort", "keyTakeaways", "replayLinkPlaceholder"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const webinarTitle = String(args.webinarTitle).trim();
    const cohort = String(args.cohort);
    const keyTakeaways = Array.isArray(args.keyTakeaways)
      ? (args.keyTakeaways as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, MAX_TAKEAWAYS)
      : [];
    const replayLink = String(args.replayLinkPlaceholder).trim();
    const nextStepsLink = args.nextStepsLinkPlaceholder
      ? String(args.nextStepsLinkPlaceholder).trim()
      : "";

    if (!(COHORTS as readonly string[]).includes(cohort)) {
      return {
        ok: false,
        refused: true,
        reason: `cohort must be one of: ${COHORTS.join(", ")}`,
      };
    }
    if (webinarTitle.length < 3) {
      return { ok: false, refused: true, reason: "webinarTitle too short." };
    }
    if (keyTakeaways.length < MIN_TAKEAWAYS) {
      return {
        ok: false,
        refused: true,
        reason: `keyTakeaways must have ≥${MIN_TAKEAWAYS} entries.`,
      };
    }
    if (replayLink.length < 3) {
      return {
        ok: false,
        refused: true,
        reason: "replayLinkPlaceholder too short.",
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `${webinarTitle} email voice followup drip`.slice(0, 300),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const cohortClause =
      cohort === "attended"
        ? "Audience attended live — thank them, reinforce takeaways, point to next-steps."
        : "Audience missed it — open with no guilt-tripping, lead with replay link, summarise takeaways.";

    const systemPrompt = [
      "You are the Webinar Host writing a 3-email post-event drip.",
      "Output STRICT JSON: { cohort, emails, unsubscribeNote }.",
      "emails: EXACTLY 3 entries, each { delayHours, subject, body, ctaAngle, ctaLinkPlaceholder }.",
      "delayHours: integer hours from event end. Conventionally: [2, 24, 168].",
      "subject: ≤60 chars.",
      "body: ≤200 words. Reference the operator's keyTakeaways. Use the replayLinkPlaceholder verbatim.",
      "ctaAngle: ≤30 chars — the asked action.",
      "ctaLinkPlaceholder: replayLinkPlaceholder for at least one email; nextStepsLinkPlaceholder for the final email if supplied.",
      "unsubscribeNote: 1 sentence reminding the operator to include an unsubscribe link (GDPR / CAN-SPAM).",
      cohortClause,
      `Operator replayLinkPlaceholder (verbatim): ${replayLink}`,
      nextStepsLink ? `Operator nextStepsLinkPlaceholder: ${nextStepsLink}` : "",
      "ABSOLUTE RULES:",
      "  - NEVER guilt-trip no-shows.",
      "  - NEVER claim attendance stats / ratings that aren't supplied.",
      "  - NEVER fabricate URLs.",
      "Brand Bible context:",
      bbBlock,
    ]
      .filter(Boolean)
      .join("\n");

    const userContent = [
      `webinarTitle: ${webinarTitle}`,
      `cohort: ${cohort}`,
      "keyTakeaways:",
      ...keyTakeaways.map((k) => `  - ${k}`),
    ].join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 1300,
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
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return { ok: false, refused: true, reason: "Model returned invalid JSON." };
      }

      const allowedLinks = new Set(
        [replayLink, nextStepsLink].filter((s) => s.length > 0),
      );
      const rawEmails = Array.isArray(parsed.emails)
        ? (parsed.emails as Array<Record<string, unknown>>)
        : [];
      const emails = rawEmails.slice(0, 3).map((e, i) => {
        const ctaLink =
          typeof e.ctaLinkPlaceholder === "string" &&
          allowedLinks.has(e.ctaLinkPlaceholder as string)
            ? (e.ctaLinkPlaceholder as string)
            : replayLink;
        return {
          delayHours:
            typeof e.delayHours === "number" && Number.isFinite(e.delayHours)
              ? Math.max(0, Math.round(e.delayHours as number))
              : [2, 24, 168][i] ?? 24,
          subject: typeof e.subject === "string" ? (e.subject as string) : "",
          body: typeof e.body === "string" ? (e.body as string) : "",
          ctaAngle:
            typeof e.ctaAngle === "string" ? (e.ctaAngle as string) : "",
          ctaLinkPlaceholder: ctaLink,
        };
      });

      await logSecurityEvent({
        kind: "webinar.drip.drafted",
        tenantId: ctx.tenantId,
        payload: {
          subject: "webinar.drip.drafted",
          webinarTitle,
          cohort,
          emailsCount: emails.length,
          takeawaysCount: keyTakeaways.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          webinarTitle,
          cohort,
          emails,
          unsubscribeNote:
            typeof parsed.unsubscribeNote === "string"
              ? parsed.unsubscribeNote
              : "Include a working unsubscribe link in every email (GDPR + CAN-SPAM).",
          notForSend:
            "Drip is staged for operator approval before scheduling on the email pipeline.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Drip draft failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
