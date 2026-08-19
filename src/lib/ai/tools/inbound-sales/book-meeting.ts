import { and, eq } from "drizzle-orm";
import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * book_meeting — schedule a discovery / demo call with the prospect.
 *
 * Backed by a per-tenant calendar integration (Calendly v2, Cal.com,
 * Google Calendar) when wired. Until those connectors land (Sprint 23
 * adds Cal.com first), this tool runs in fixture mode:
 *
 *   - Reads the worker.settings.availableSlots[] (set on hire) for a
 *     deterministic list of bookable times
 *   - Picks the first slot ≥ args.preferredAt, otherwise the next slot
 *   - Returns confirmation + meeting URL (fixture domain)
 *   - Appends a `meeting` entry to `leads.metadata.meetings[]`
 *   - Flips lead.status → 'contacted'
 *
 * Real Cal.com integration overrides the executor by calling the same
 * tool — the function signature won't change.
 */

interface MeetingSlot {
  startAt: string; // ISO
  endAt: string;
  bookingUrl: string;
}

export const bookMeetingTool: Tool = {
  name: "book_meeting",
  description:
    "Book a discovery call with the prospect. Use this AFTER qualify_lead returned a score above the threshold (or the prospect explicitly asks for a demo). Returns a confirmed meeting time + booking URL the prospect can use to reschedule.",
  parameters: {
    type: "object",
    properties: {
      leadEmail: {
        type: "string",
        description: "Prospect's email — must match a lead row qualify_lead just created.",
      },
      preferredAt: {
        type: "string",
        description:
          "ISO 8601 UTC time the prospect mentioned. Pick the closest available slot ≥ this time. If they didn't give a time, pass tomorrow at 14:00 UTC as a default starting point.",
      },
      durationMinutes: {
        type: "integer",
        description: "Meeting length. Default 30. Discovery calls are usually 30, demos 45-60.",
        minimum: 15,
        maximum: 90,
      },
      subject: {
        type: "string",
        description: "1-line meeting title that goes on the calendar event ('Staffbix x Northway · Discovery call').",
      },
    },
    required: ["leadEmail", "preferredAt", "durationMinutes", "subject"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const leadEmail = String(args.leadEmail).trim().toLowerCase();
    const preferredAtIso = String(args.preferredAt);
    const durationMinutes = Number(args.durationMinutes);
    const subject = String(args.subject).trim();

    if (!Number.isFinite(Date.parse(preferredAtIso))) {
      return { ok: false, refused: true, reason: "preferredAt is not a valid ISO 8601 timestamp." };
    }
    if (!subject) {
      return { ok: false, refused: true, reason: "subject is required for the calendar event." };
    }

    /* ── pick a slot ──────────────────────────────────────────── */
    const slot = await pickSlot({
      tenantId: ctx.tenantId,
      preferredAtIso,
      durationMinutes,
    });
    if (!slot) {
      return {
        ok: false,
        refused: true,
        reason: "No available slots — tell the prospect we'll follow up with options by email.",
      };
    }

    /* ── verify lead exists, append meeting ──────────────────── */
    const [lead] = await db
      .select({
        id: leads.id,
        metadata: leads.metadata,
      })
      .from(leads)
      .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.email, leadEmail)))
      .limit(1);

    if (!lead) {
      return {
        ok: false,
        refused: true,
        reason: "No qualified lead with that email — call qualify_lead first.",
      };
    }

    try {
      const meta = (lead.metadata as Record<string, unknown>) ?? {};
      const meetings = Array.isArray(meta.meetings) ? (meta.meetings as unknown[]) : [];
      meetings.push({
        startAt: slot.startAt,
        endAt: slot.endAt,
        bookingUrl: slot.bookingUrl,
        subject,
        workerId: ctx.workerId,
        bookedAt: new Date().toISOString(),
      });

      await db
        .update(leads)
        .set({
          status: "contacted",
          lastContactedAt: new Date(),
          metadata: { ...meta, meetings },
          updatedAt: new Date(),
        })
        .where(eq(leads.id, lead.id));

      await logSecurityEvent({
        kind: "lead.meeting.booked",
        tenantId: ctx.tenantId,
        payload: {
          subject: "lead.meeting.booked",
          leadId: lead.id,
          leadEmail,
          startAt: slot.startAt,
          endAt: slot.endAt,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          confirmed: true,
          startAt: slot.startAt,
          endAt: slot.endAt,
          bookingUrl: slot.bookingUrl,
          subject,
          confirmationToCustomer: `Booked ${subject} for ${formatHuman(slot.startAt)} (${durationMinutes} min). Reschedule link: ${slot.bookingUrl}`,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't persist the meeting: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};

/* ── slot resolver ───────────────────────────────────────────── */

async function pickSlot(args: {
  tenantId: string;
  preferredAtIso: string;
  durationMinutes: number;
}): Promise<MeetingSlot | null> {
  // Fixture mode (audit + tenants without Cal.com wired): generate
  // 5 deterministic slots over the next 5 weekday afternoons (14:00 UTC).
  if (process.env.MEETING_FIXTURE === "1") {
    const slots: MeetingSlot[] = [];
    const base = new Date();
    base.setUTCHours(14, 0, 0, 0);
    let day = 0;
    while (slots.length < 5 && day < 14) {
      day++;
      const candidate = new Date(base);
      candidate.setUTCDate(base.getUTCDate() + day);
      const dow = candidate.getUTCDay();
      if (dow === 0 || dow === 6) continue; // skip Sat/Sun
      const startAt = candidate.toISOString();
      const endAt = new Date(candidate.getTime() + args.durationMinutes * 60_000).toISOString();
      slots.push({
        startAt,
        endAt,
        bookingUrl: `https://cal.fixture.staffbix.test/${args.tenantId.slice(0, 8)}/${startAt.slice(0, 10)}`,
      });
    }
    const preferredMs = Date.parse(args.preferredAtIso);
    const chosen = slots.find((s) => Date.parse(s.startAt) >= preferredMs) ?? slots[0];
    return chosen ?? null;
  }

  // Real Cal.com / Calendly provider (Sprint 23+) lives here. For now
  // tenants without the fixture get a graceful no-op so the tool says
  // "no slots — circle back" and the model handles it.
  return null;
}

function formatHuman(iso: string): string {
  const d = new Date(iso);
  return d.toUTCString();
}
