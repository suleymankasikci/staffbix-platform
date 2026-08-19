import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { contactMessages } from "@/lib/db/schema";
import {
  getClientIp,
  getUserAgent,
  normalizeEmail,
  readJson,
} from "@/lib/auth/request";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/contact — public contact-form submission.
 *
 * Single-tenant inbound: this is the marketing-site form, fired before
 * anyone has signed up, so there's no tenantId. Hardened with:
 *   - hard length caps on every field (DoS guard)
 *   - per-IP rate limit on the `webhook` bucket
 *   - honeypot (`hp_field`) — if non-empty, silently 200 and drop
 *   - source IP + user-agent stored for staff triage / spam review
 *
 * Returns `{ ok: true, id }` on success. Validation errors return 400 with
 * `{ ok: false, error }`. Rate-limit returns 429 from the helper.
 */

const MAX_NAME = 80;
const MAX_EMAIL = 254;
const MAX_COMPANY = 160;
const MAX_TOPIC = 80;
const MAX_MESSAGE = 5000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Body {
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  topic?: string;
  message?: string;
  locale?: string;
  // Honeypot — real users never fill this; bots usually do.
  hp_field?: string;
}

function clean(input: unknown, max: number): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, max);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);

  const throttled = await rateLimitOr429("webhook", `contact:${ip ?? "anon"}`, {
    ip,
    route: "POST /api/contact",
  });
  if (throttled) return throttled;

  const body = await readJson<Body>(req);
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  // Honeypot — silently accept so spammers don't learn whether they hit it.
  if (typeof body.hp_field === "string" && body.hp_field.trim().length > 0) {
    return NextResponse.json({ ok: true, id: "noop" });
  }

  const firstName = clean(body.firstName, MAX_NAME);
  const lastName = clean(body.lastName, MAX_NAME);
  const email = normalizeEmail(body.email);
  const company = clean(body.company, MAX_COMPANY);
  const topic = clean(body.topic, MAX_TOPIC);
  const message = clean(body.message, MAX_MESSAGE);
  const locale = clean(body.locale, 12);

  if (firstName.length < 1) {
    return NextResponse.json(
      { ok: false, error: "firstName is required" },
      { status: 400 },
    );
  }
  if (lastName.length < 1) {
    return NextResponse.json(
      { ok: false, error: "lastName is required" },
      { status: 400 },
    );
  }
  if (!email || !EMAIL_RE.test(email) || email.length > MAX_EMAIL) {
    return NextResponse.json(
      { ok: false, error: "valid email is required" },
      { status: 400 },
    );
  }
  if (topic.length < 1) {
    return NextResponse.json(
      { ok: false, error: "topic is required" },
      { status: 400 },
    );
  }
  if (message.length < 10) {
    return NextResponse.json(
      { ok: false, error: "message must be at least 10 characters" },
      { status: 400 },
    );
  }

  const [row] = await db
    .insert(contactMessages)
    .values({
      firstName,
      lastName,
      email,
      company: company || null,
      topic,
      message,
      locale: locale || null,
      sourceIp: ip ?? null,
      userAgent: getUserAgent(req)?.slice(0, 500) ?? null,
    })
    .returning({ id: contactMessages.id });

  void logSecurityEvent({
    kind: "contact.message.received",
    tenantId: null,
    ip,
    userAgent: getUserAgent(req),
    payload: {
      subject: "contact.message.received",
      contactMessageId: row.id,
      topic,
      locale,
    },
  });

  return NextResponse.json({ ok: true, id: row.id });
}
