import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * compile_parent_update — weekly parent email summarising the
 * student's progress. Output JSON:
 *   - subject
 *   - body: ≤250 words
 *   - strengthsCalled (array)
 *   - strugglesCalled (array)
 *   - oneSentenceMemo
 *
 * Hard rules:
 *   - NEVER invents session counts, grades, or scores.
 *   - NEVER promises grade outcomes.
 *   - Honest tone — no sycophancy, no doom-mongering.
 */

const MODEL = "gpt-4o-mini";

const SUBJECTS = ["math", "english", "science", "history", "coding", "languages", "other"] as const;

const MIN_NOTES_LEN = 30;
const MAX_NOTES_LEN = 3000;

export const compileParentUpdateTool: Tool = {
  name: "compile_parent_update",
  description:
    "Draft a weekly parent update email. Echoes session counts + strengths + struggles verbatim; LLM only writes voice. NEVER promises grade outcomes.",
  parameters: {
    type: "object",
    properties: {
      studentFirstName: { type: "string" },
      periodLabel: { type: "string", description: "e.g., 'Week of May 17'." },
      subject: { type: "string", enum: SUBJECTS },
      sessionsThisWeek: {
        type: "integer",
        minimum: 0,
        maximum: 21,
      },
      strengthsThisWeek: {
        type: "array",
        description: "Operator-supplied observed strengths.",
        items: { type: "string" },
      },
      strugglesThisWeek: {
        type: "array",
        description: "Operator-supplied observed struggles.",
        items: { type: "string" },
      },
      tutorNotes: {
        type: "string",
        description: "Free-form tutor notes. ≤3000 chars.",
      },
      nextWeekFocus: {
        type: "string",
        description: "What the tutor plans to work on next week.",
      },
    },
    required: [
      "studentFirstName",
      "periodLabel",
      "subject",
      "sessionsThisWeek",
      "tutorNotes",
    ],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const studentFirstName = String(args.studentFirstName).trim().slice(0, 40);
    const periodLabel = String(args.periodLabel).trim().slice(0, 40);
    const subject = String(args.subject);
    const sessionsThisWeek = Math.max(
      0,
      Math.min(21, Math.round(Number(args.sessionsThisWeek))),
    );
    const strengths = Array.isArray(args.strengthsThisWeek)
      ? (args.strengthsThisWeek as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 6)
      : [];
    const struggles = Array.isArray(args.strugglesThisWeek)
      ? (args.strugglesThisWeek as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 6)
      : [];
    const tutorNotes = String(args.tutorNotes).trim();
    const nextWeekFocus = args.nextWeekFocus
      ? String(args.nextWeekFocus).trim().slice(0, 400)
      : "";

    if (!(SUBJECTS as readonly string[]).includes(subject)) {
      return {
        ok: false,
        refused: true,
        reason: `subject must be one of: ${SUBJECTS.join(", ")}`,
      };
    }
    if (studentFirstName.length < 1) {
      return { ok: false, refused: true, reason: "studentFirstName required." };
    }
    if (periodLabel.length < 2) {
      return { ok: false, refused: true, reason: "periodLabel too short." };
    }
    if (tutorNotes.length < MIN_NOTES_LEN || tutorNotes.length > MAX_NOTES_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `tutorNotes must be ${MIN_NOTES_LEN}-${MAX_NOTES_LEN} chars.`,
      };
    }

    const systemPrompt = [
      "You are a tutor writing a weekly parent update.",
      "Output STRICT JSON: { subject, body, strengthsCalled, strugglesCalled, oneSentenceMemo, warnings }.",
      "subject: ≤60 chars email subject.",
      "body: ≤250 words. Honest, warm, no sycophancy. Echo strengths + struggles verbatim where appropriate. Reference sessionsThisWeek factually.",
      "strengthsCalled: echo the supplied strengths array verbatim (filtered to those mentioned in body).",
      "strugglesCalled: echo the supplied struggles array verbatim (filtered to those mentioned in body).",
      "oneSentenceMemo: tweet-length parent-readable summary.",
      "warnings: 0-3 strings — anything the operator should review (e.g., 'session count is 0 — confirm before sending').",
      "ABSOLUTE RULES:",
      "  - NEVER invent test scores, percentile rankings, IQ-style claims.",
      "  - NEVER promise grade outcomes ('A guaranteed next term').",
      "  - NEVER claim the child has a diagnosis (ADHD / dyslexia / etc.) — only describe observed behavior.",
      `studentFirstName: ${studentFirstName}; subject: ${subject}; periodLabel: ${periodLabel}`,
      `sessionsThisWeek: ${sessionsThisWeek}`,
      strengths.length > 0 ? `strengths: ${strengths.join(" | ")}` : "",
      struggles.length > 0 ? `struggles: ${struggles.join(" | ")}` : "",
      nextWeekFocus ? `nextWeekFocus: ${nextWeekFocus}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Tutor notes:\n${tutorNotes}` },
        ],
        max_tokens: 900,
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

      const allowedStrengths = new Set(strengths);
      const allowedStruggles = new Set(struggles);

      const strengthsCalled = Array.isArray(parsed.strengthsCalled)
        ? (parsed.strengthsCalled as string[]).filter((s) =>
            allowedStrengths.has(s),
          )
        : [];
      const strugglesCalled = Array.isArray(parsed.strugglesCalled)
        ? (parsed.strugglesCalled as string[]).filter((s) =>
            allowedStruggles.has(s),
          )
        : [];

      const warnings = Array.isArray(parsed.warnings)
        ? (parsed.warnings as string[]).slice(0, 3)
        : [];
      if (sessionsThisWeek === 0) {
        warnings.unshift(
          "sessionsThisWeek=0 — operator should confirm the child actually attended before sending.",
        );
      }

      await logSecurityEvent({
        kind: "tutor.parent.update",
        tenantId: ctx.tenantId,
        payload: {
          subject: "tutor.parent.update",
          subjectArea: subject,
          sessionsThisWeek,
          strengthsCount: strengthsCalled.length,
          strugglesCount: strugglesCalled.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          studentFirstName,
          periodLabel,
          subject,
          sessionsThisWeek,
          emailSubject:
            typeof parsed.subject === "string" ? (parsed.subject as string) : "",
          body: typeof parsed.body === "string" ? (parsed.body as string) : "",
          strengthsCalled,
          strugglesCalled,
          oneSentenceMemo:
            typeof parsed.oneSentenceMemo === "string"
              ? parsed.oneSentenceMemo
              : "",
          warnings,
          notForSend: "Draft only. Operator approves before sending to parent.",
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Parent update failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
