import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * compose_appointment_reminder — produce reminder / no-show recovery
 * messages tailored by channel (SMS/WhatsApp ≤320 chars; email
 * subject + body).
 *
 * Cohorts:
 *   - first_visit: include arrival instructions
 *   - returning: short confirmation
 *   - no_show_recovery: warm reschedule offer (NO guilt language)
 */

const MODEL = "gpt-4o-mini";

const CHANNELS = ["sms", "whatsapp", "email"] as const;
const COHORTS = ["first_visit", "returning", "no_show_recovery"] as const;

const MIN_PRACTITIONER_LEN = 2;
const MAX_INSTRUCTIONS_LEN = 600;

export const composeAppointmentReminderTool: Tool = {
  name: "compose_appointment_reminder",
  description:
    "Compose an appointment reminder or no-show recovery message tailored by channel + cohort. SMS/WhatsApp ≤320 chars; email subject + body. Never guilts no-shows; never invents instructions.",
  parameters: {
    type: "object",
    properties: {
      channel: { type: "string", enum: CHANNELS },
      cohort: { type: "string", enum: COHORTS },
      patientFirstName: { type: "string" },
      practitionerName: { type: "string" },
      appointmentStartIso: { type: "string" },
      arrivalInstructions: {
        type: "string",
        description:
          "Operator-supplied instructions (parking, paperwork, what to bring). Used verbatim.",
      },
      rescheduleLinkPlaceholder: {
        type: "string",
        description: "Operator-supplied URL or placeholder. Used verbatim.",
      },
      industry: {
        type: "string",
        description: "Free-form industry tag (e.g., 'dental_clinic'). ≤40 chars.",
      },
      languageHint: {
        type: "string",
        description: "2-letter target language. Default 'en'.",
      },
    },
    required: [
      "channel",
      "cohort",
      "patientFirstName",
      "practitionerName",
      "appointmentStartIso",
    ],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const channel = String(args.channel);
    const cohort = String(args.cohort);
    const patientFirstName = String(args.patientFirstName).trim().slice(0, 40);
    const practitionerName = String(args.practitionerName).trim().slice(0, 80);
    const appointmentStartIso = String(args.appointmentStartIso).trim();
    const arrivalInstructions = args.arrivalInstructions
      ? String(args.arrivalInstructions).trim().slice(0, MAX_INSTRUCTIONS_LEN)
      : "";
    const rescheduleLinkPlaceholder = args.rescheduleLinkPlaceholder
      ? String(args.rescheduleLinkPlaceholder).trim()
      : "";
    const industry = args.industry
      ? String(args.industry).trim().slice(0, 40)
      : "";
    const languageHint = args.languageHint
      ? String(args.languageHint).trim().toLowerCase().slice(0, 2)
      : "en";

    if (!(CHANNELS as readonly string[]).includes(channel)) {
      return {
        ok: false,
        refused: true,
        reason: `channel must be one of: ${CHANNELS.join(", ")}`,
      };
    }
    if (!(COHORTS as readonly string[]).includes(cohort)) {
      return {
        ok: false,
        refused: true,
        reason: `cohort must be one of: ${COHORTS.join(", ")}`,
      };
    }
    if (patientFirstName.length < 1) {
      return { ok: false, refused: true, reason: "patientFirstName required." };
    }
    if (practitionerName.length < MIN_PRACTITIONER_LEN) {
      return { ok: false, refused: true, reason: "practitionerName too short." };
    }
    const apptMs = Date.parse(appointmentStartIso);
    if (!Number.isFinite(apptMs)) {
      return {
        ok: false,
        refused: true,
        reason: "appointmentStartIso must be a valid ISO 8601 timestamp.",
      };
    }
    if (rescheduleLinkPlaceholder && !/^https?:\/\/|^<.+>$/.test(rescheduleLinkPlaceholder)) {
      return {
        ok: false,
        refused: true,
        reason: "rescheduleLinkPlaceholder must be a URL or placeholder like '<reschedule_link>'.",
      };
    }

    const cohortClause: Record<(typeof COHORTS)[number], string> = {
      first_visit:
        "Audience is a first-time visitor. Mention arrival instructions verbatim if supplied. Brief and welcoming.",
      returning:
        "Audience is a returning patient/customer. Short confirmation; do NOT repeat arrival instructions unless supplied.",
      no_show_recovery:
        "Audience missed a previous appointment. Warm reschedule offer — NEVER use guilt / shaming language ('you didn't show up', 'we waited').",
    };

    const channelClause: Record<(typeof CHANNELS)[number], string> = {
      sms: "Output a single 'message' string (≤320 chars total). No subject. No URL unless rescheduleLinkPlaceholder supplied.",
      whatsapp:
        "Output a single 'message' string (≤320 chars total). Emojis OK in moderation.",
      email: "Output 'subject' (≤60 chars) + 'message' (body, ≤300 words).",
    };

    const systemPrompt = [
      `You are composing an appointment reminder in language code '${languageHint}'.`,
      "Output STRICT JSON: { subject, message, complianceFlags }.",
      "subject: only for email — empty string for sms/whatsapp.",
      "message: cohort + channel-appropriate text.",
      "complianceFlags: 0-3 strings — surface borderline phrasing.",
      "ABSOLUTE RULES:",
      "  - NEVER invent practitioner credentials, diagnoses, procedures.",
      "  - NEVER guilt-trip no-shows.",
      "  - NEVER include health information beyond what the operator supplied.",
      "  - NEVER include a URL that isn't the rescheduleLinkPlaceholder.",
      cohortClause[cohort as (typeof COHORTS)[number]],
      channelClause[channel as (typeof CHANNELS)[number]],
      `patientFirstName: ${patientFirstName}`,
      `practitionerName: ${practitionerName}`,
      `appointmentStartIso: ${appointmentStartIso}`,
      industry ? `industry: ${industry}` : "",
      arrivalInstructions
        ? `arrivalInstructions (verbatim if used): ${arrivalInstructions}`
        : "No arrival instructions supplied.",
      rescheduleLinkPlaceholder
        ? `rescheduleLinkPlaceholder (verbatim if used): ${rescheduleLinkPlaceholder}`
        : "No reschedule link — DO NOT include a URL.",
    ]
      .filter(Boolean)
      .join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Compose the ${channel} ${cohort} message.` },
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

      let message = typeof parsed.message === "string" ? parsed.message : "";
      const subject =
        channel === "email" && typeof parsed.subject === "string"
          ? (parsed.subject as string).slice(0, 60)
          : "";

      // Server-side length clamp.
      const charCap = channel === "email" ? 4000 : 320;
      if (message.length > charCap) {
        message = message.slice(0, charCap - 3) + "...";
      }

      // URL whitelist scan.
      const complianceFlags = Array.isArray(parsed.complianceFlags)
        ? (parsed.complianceFlags as string[]).slice(0, 3)
        : [];
      const urlMatches = message.match(/https?:\/\/\S+/g) ?? [];
      for (const u of urlMatches) {
        if (u !== rescheduleLinkPlaceholder) {
          complianceFlags.push(`Unexpected URL in message: ${u}`);
        }
      }
      // Guilt-detector for no_show_recovery cohort.
      if (
        cohort === "no_show_recovery" &&
        /(no[- ]?show|didn'?t show|missed|we waited)/i.test(message)
      ) {
        complianceFlags.push(
          "no_show_recovery message may contain guilt language — operator should review.",
        );
      }

      await logSecurityEvent({
        kind: "receptionist.reminder.composed",
        tenantId: ctx.tenantId,
        payload: {
          subject: "receptionist.reminder.composed",
          channel,
          cohort,
          industry: industry || null,
          messageLength: message.length,
          complianceFlagsCount: complianceFlags.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          channel,
          cohort,
          industry: industry || null,
          appointmentStartIso,
          subject,
          message,
          messageLength: message.length,
          withinChannelLimit: message.length <= (channel === "email" ? 4000 : 320),
          complianceFlags,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Reminder compose failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
