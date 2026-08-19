import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * generate_socratic_hint — produce 1-3 escalating hints for a student
 * problem WITHOUT revealing the answer.
 *
 * Output JSON:
 *   - hints: [{ level, hint }] 1-3 entries, increasing specificity
 *   - hasRevealedAnswer: false (server enforced via correctAnswer scan)
 *   - misconceptionDetected: 0-3 strings describing likely confusion
 *   - encouragement: 1 short sentence, specific, never sycophantic
 *
 * Hard rules:
 *   - If correctAnswer is supplied, server-side scan rejects any hint
 *     containing it verbatim.
 *   - studentLevel ('elementary'|'middle'|'high'|'undergrad') gates
 *     hint complexity.
 */

const MODEL = "gpt-4o-mini";

const SUBJECTS = ["math", "english", "science", "history", "coding", "languages", "other"] as const;
const LEVELS = ["elementary", "middle", "high", "undergrad"] as const;

const MIN_PROBLEM_LEN = 10;
const MAX_PROBLEM_LEN = 2000;

export const generateSocraticHintTool: Tool = {
  name: "generate_socratic_hint",
  description:
    "Produce 1-3 escalating Socratic hints for a student problem. NEVER reveals the answer — server-side scan rejects hints containing correctAnswer verbatim.",
  parameters: {
    type: "object",
    properties: {
      subject: { type: "string", enum: SUBJECTS },
      studentLevel: { type: "string", enum: LEVELS },
      problemText: { type: "string", description: "The problem the student is stuck on. ≤2000 chars." },
      studentAttempt: {
        type: "string",
        description: "The student's current attempt or 'no attempt yet'.",
      },
      correctAnswer: {
        type: "string",
        description:
          "Optional — if supplied, server-side scan ensures NO hint contains it verbatim.",
      },
      numHints: {
        type: "integer",
        description: "How many hints to produce (1-3). Default 3.",
        minimum: 1,
        maximum: 3,
      },
    },
    required: ["subject", "studentLevel", "problemText"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const subject = String(args.subject);
    const studentLevel = String(args.studentLevel);
    const problemText = String(args.problemText).trim();
    const studentAttempt = args.studentAttempt
      ? String(args.studentAttempt).trim().slice(0, 1000)
      : "no attempt yet";
    const correctAnswer = args.correctAnswer
      ? String(args.correctAnswer).trim()
      : "";
    const numHints = Math.max(1, Math.min(3, Math.round(Number(args.numHints ?? 3))));

    if (!(SUBJECTS as readonly string[]).includes(subject)) {
      return {
        ok: false,
        refused: true,
        reason: `subject must be one of: ${SUBJECTS.join(", ")}`,
      };
    }
    if (!(LEVELS as readonly string[]).includes(studentLevel)) {
      return {
        ok: false,
        refused: true,
        reason: `studentLevel must be one of: ${LEVELS.join(", ")}`,
      };
    }
    if (problemText.length < MIN_PROBLEM_LEN || problemText.length > MAX_PROBLEM_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `problemText must be ${MIN_PROBLEM_LEN}-${MAX_PROBLEM_LEN} chars.`,
      };
    }

    const systemPrompt = [
      "You are a Socratic tutor. NEVER give the answer — only escalating hints.",
      `Output STRICT JSON: { hints, misconceptionDetected, encouragement }. hints: EXACTLY ${numHints} entries of { level, hint }.`,
      "level: 1 (gentle nudge) → numHints (clearest hint short of the answer).",
      "hint: ≤40 words. Each hint should advance the student a step.",
      "misconceptionDetected: 0-3 strings describing likely confusion based on the attempt.",
      "encouragement: 1 sentence specific to what the student is doing right (or trying).",
      "ABSOLUTE RULES:",
      "  - NEVER reveal the final answer.",
      "  - NEVER write 'the answer is …'.",
      "  - NEVER complete the student's work for them — only point to the next step.",
      `subject: ${subject}; studentLevel: ${studentLevel}`,
      correctAnswer ? `correctAnswer (operator-supplied; DO NOT echo verbatim): ${correctAnswer}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Problem:\n${problemText}\n\nStudent attempt:\n${studentAttempt}`,
          },
        ],
        max_tokens: 500,
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

      const rawHints = Array.isArray(parsed.hints)
        ? (parsed.hints as Array<Record<string, unknown>>)
        : [];

      let hasRevealedAnswer = false;
      const sanitizedHints = rawHints
        .slice(0, numHints)
        .map((h, i) => {
          let hintText = typeof h.hint === "string" ? h.hint : "";
          const containsAnswer =
            correctAnswer.length > 0 &&
            hintText.toLowerCase().includes(correctAnswer.toLowerCase());
          if (containsAnswer) {
            hasRevealedAnswer = true;
            hintText =
              "[REDACTED — hint accidentally contained the answer; please regenerate.]";
          }
          // Also block obvious 'the answer is X' patterns even without
          // an explicit correctAnswer.
          if (/\bthe answer is\b/i.test(hintText)) {
            hasRevealedAnswer = true;
            hintText =
              "[REDACTED — hint said 'the answer is …'; please regenerate.]";
          }
          return {
            level:
              typeof h.level === "number" && Number.isInteger(h.level)
                ? Math.max(1, Math.min(numHints, h.level as number))
                : i + 1,
            hint: hintText,
          };
        })
        .filter((h) => h.hint.length > 0);

      await logSecurityEvent({
        kind: "tutor.hint.generated",
        tenantId: ctx.tenantId,
        payload: {
          subject: "tutor.hint.generated",
          subjectArea: subject,
          studentLevel,
          numHintsReturned: sanitizedHints.length,
          hasRevealedAnswer,
          correctAnswerSupplied: correctAnswer.length > 0,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          subject,
          studentLevel,
          hints: sanitizedHints,
          hasRevealedAnswer,
          misconceptionDetected: Array.isArray(parsed.misconceptionDetected)
            ? (parsed.misconceptionDetected as string[]).slice(0, 3)
            : [],
          encouragement:
            typeof parsed.encouragement === "string"
              ? (parsed.encouragement as string)
              : "",
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Hint generation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
