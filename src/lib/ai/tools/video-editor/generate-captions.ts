import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * generate_captions — deterministic caption formatter for a short
 * video clip. Takes plain text (the spoken transcript of the clip),
 * a target style (vertical / square / landscape), and produces caption
 * lines that fit the readability rules for each format.
 *
 * Output:
 *   - lines: array of { text, charLength, wordCount }
 *   - linesCount, longestLineChars, longestLineWords
 *   - withinReadabilityLimits: boolean
 *   - styleRules used
 *
 * No LLM call — this is purely typography arithmetic.
 */

const STYLES = [
  "vertical_open_captions",
  "vertical_kinetic",
  "square_open_captions",
  "landscape_lower_third",
] as const;

const STYLE_RULES: Record<
  (typeof STYLES)[number],
  { maxCharsPerLine: number; maxWordsPerLine: number; targetWordsPerLine: number }
> = {
  vertical_open_captions: { maxCharsPerLine: 26, maxWordsPerLine: 4, targetWordsPerLine: 3 },
  vertical_kinetic: { maxCharsPerLine: 16, maxWordsPerLine: 2, targetWordsPerLine: 1 },
  square_open_captions: { maxCharsPerLine: 32, maxWordsPerLine: 5, targetWordsPerLine: 4 },
  landscape_lower_third: { maxCharsPerLine: 60, maxWordsPerLine: 12, targetWordsPerLine: 9 },
};

const MIN_TEXT_LEN = 2;
const MAX_TEXT_LEN = 4000;

export const generateCaptionsTool: Tool = {
  name: "generate_captions",
  description:
    "Format spoken text into platform-appropriate caption lines (vertical / square / landscape). Pure typography arithmetic — no LLM, no rewriting of words.",
  parameters: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "The spoken text of the clip. Verbatim — captions DO NOT paraphrase.",
      },
      style: { type: "string", enum: STYLES },
      uppercase: {
        type: "boolean",
        description: "Output ALL CAPS (common for vertical kinetic). Default false.",
      },
    },
    required: ["text", "style"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const text = String(args.text).trim();
    const style = String(args.style);
    const uppercase = Boolean(args.uppercase);

    if (!(STYLES as readonly string[]).includes(style)) {
      return {
        ok: false,
        refused: true,
        reason: `style must be one of: ${STYLES.join(", ")}`,
      };
    }
    if (text.length < MIN_TEXT_LEN) {
      return { ok: false, refused: true, reason: "text too short." };
    }
    if (text.length > MAX_TEXT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `text too long (max ${MAX_TEXT_LEN} chars).`,
      };
    }

    const rules = STYLE_RULES[style as (typeof STYLES)[number]];
    const words = text
      .replace(/\s+/g, " ")
      .split(" ")
      .filter((w) => w.length > 0);

    // Greedy line packing: stay under maxCharsPerLine + maxWordsPerLine,
    // aim for targetWordsPerLine for natural rhythm.
    const lines: string[] = [];
    let current: string[] = [];
    let currentChars = 0;
    for (const w of words) {
      const candidateChars = currentChars + (current.length === 0 ? 0 : 1) + w.length;
      const candidateWords = current.length + 1;
      const overChar = candidateChars > rules.maxCharsPerLine;
      const overWord = candidateWords > rules.maxWordsPerLine;
      const meetingTarget = current.length >= rules.targetWordsPerLine;
      if ((overChar || overWord) && current.length > 0) {
        lines.push(current.join(" "));
        current = [w];
        currentChars = w.length;
        continue;
      }
      if (meetingTarget && /[.,!?]$/.test(current[current.length - 1] ?? "")) {
        // Break at natural punctuation when target reached.
        lines.push(current.join(" "));
        current = [w];
        currentChars = w.length;
        continue;
      }
      current.push(w);
      currentChars = candidateChars;
    }
    if (current.length > 0) lines.push(current.join(" "));

    const finalLines = lines.map((l) => (uppercase ? l.toUpperCase() : l));
    const summary = finalLines.map((l) => ({
      text: l,
      charLength: l.length,
      wordCount: l.split(/\s+/).filter(Boolean).length,
    }));
    const longestLineChars = summary.reduce(
      (m, s) => Math.max(m, s.charLength),
      0,
    );
    const longestLineWords = summary.reduce(
      (m, s) => Math.max(m, s.wordCount),
      0,
    );
    const withinReadabilityLimits =
      longestLineChars <= rules.maxCharsPerLine &&
      longestLineWords <= rules.maxWordsPerLine;

    await logSecurityEvent({
      kind: "video.captions.generated",
      tenantId: ctx.tenantId,
      payload: {
        subject: "video.captions.generated",
        style,
        linesCount: summary.length,
        longestLineChars,
        uppercase,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        style,
        uppercase,
        styleRules: rules,
        lines: summary,
        linesCount: summary.length,
        longestLineChars,
        longestLineWords,
        withinReadabilityLimits,
      },
    };
  },
};
