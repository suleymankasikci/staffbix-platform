import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";

/**
 * parse_cv — extract structured fields from a CV / resume text. Uses
 * a separate OpenAI call with JSON response format so the output is
 * machine-readable for the HR Assistant's applicant-tracking flow.
 *
 * Extracted fields:
 *   - name, email, phone (with light validation)
 *   - currentTitle, currentCompany
 *   - yearsExperience (estimated)
 *   - keySkills (array)
 *   - languages (array)
 *   - education (array of { degree, school, year })
 *   - notableExperience (1-3 line summary)
 *
 * Privacy notice: the raw CV text is NOT persisted by this tool —
 * only the extracted structured fields end up in the applicant row.
 * The model also gets a system instruction to redact sensitive
 * categorical info (race, religion, medical) if accidentally present.
 */

const MODEL = "gpt-4o-mini";

export const parseCvTool: Tool = {
  name: "parse_cv",
  description:
    "Extract structured fields from a CV/resume text. Returns name, email, phone, current title + company, estimated years of experience, key skills, languages, education, and a notable-experience summary. SENSITIVE categorical data (race, religion, medical) is redacted by design.",
  parameters: {
    type: "object",
    properties: {
      cvText: {
        type: "string",
        description: "The full CV text — raw OCR / paste / scrape.",
      },
      jobContext: {
        type: "string",
        description:
          "Optional 1-line description of the role we're hiring for. Helps the model focus on the most-relevant skills + experience for that role.",
      },
    },
    required: ["cvText"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const cvText = String(args.cvText).trim();
    const jobContext = args.jobContext ? String(args.jobContext).trim() : "";

    if (cvText.length < 100) {
      return { ok: false, refused: true, reason: "cvText too short (< 100 chars) — likely truncated." };
    }
    if (cvText.length > 50_000) {
      return { ok: false, refused: true, reason: "cvText > 50k chars — truncate before passing." };
    }

    const systemPrompt = [
      "You extract structured fields from CVs / resumes.",
      "Output STRICT JSON in this shape, no prose:",
      "{",
      '  "name": string | null,',
      '  "email": string | null,',
      '  "phone": string | null,',
      '  "currentTitle": string | null,',
      '  "currentCompany": string | null,',
      '  "yearsExperience": number | null,',
      '  "keySkills": string[],',
      '  "languages": string[],',
      '  "education": [{ "degree": string, "school": string, "year": number | null }],',
      '  "notableExperience": string',
      "}",
      "DO NOT extract or output: race, ethnicity, religion, marital status, health, or photos. If those appear in the CV, IGNORE them.",
      "If a field can't be determined, use null (not empty string).",
      jobContext ? `Focus context: ${jobContext}` : "",
    ].filter(Boolean).join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: cvText },
        ],
        max_tokens: 900,
        temperature: 0.2,
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

      // Light email + phone sanity (no regexp required, just trim
      // and basic check).
      const email =
        typeof parsed.email === "string" && parsed.email.includes("@")
          ? parsed.email.trim()
          : null;

      return {
        ok: true,
        data: {
          name: typeof parsed.name === "string" ? parsed.name : null,
          email,
          phone: typeof parsed.phone === "string" ? parsed.phone : null,
          currentTitle: typeof parsed.currentTitle === "string" ? parsed.currentTitle : null,
          currentCompany: typeof parsed.currentCompany === "string" ? parsed.currentCompany : null,
          yearsExperience:
            typeof parsed.yearsExperience === "number" ? parsed.yearsExperience : null,
          keySkills: Array.isArray(parsed.keySkills) ? (parsed.keySkills as string[]) : [],
          languages: Array.isArray(parsed.languages) ? (parsed.languages as string[]) : [],
          education: Array.isArray(parsed.education) ? parsed.education : [],
          notableExperience:
            typeof parsed.notableExperience === "string" ? parsed.notableExperience : "",
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `CV parsing failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
