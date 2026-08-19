-- Sprint 83 (audit-fix) — backend storage for the public contact form.
-- Replaces the static contact page that previously had no submit
-- handler at all. Tied to the marketing site rather than any tenant —
-- there's no tenant_id (the visitor hasn't signed up yet).
--
-- Also adds `contact.message.received` to the security-event kind enum
-- so the audit feed has a dedicated row for inbound contact-form
-- submissions instead of reusing an unrelated kind.

ALTER TYPE "public"."security_event_kind"
  ADD VALUE IF NOT EXISTS 'contact.message.received';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind"
  ADD VALUE IF NOT EXISTS 'team.role_changed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind"
  ADD VALUE IF NOT EXISTS 'team.member_removed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind"
  ADD VALUE IF NOT EXISTS 'report.updated';--> statement-breakpoint



CREATE TYPE "public"."contact_message_status" AS ENUM (
  'new', 'in_progress', 'answered', 'spam', 'closed'
);--> statement-breakpoint

CREATE TABLE "contact_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "email" text NOT NULL,
  "company" text,
  "topic" text NOT NULL,
  "message" text NOT NULL,
  "locale" text,
  "source_ip" inet,
  "user_agent" text,
  "status" contact_message_status NOT NULL DEFAULT 'new',
  "handled_by" text,
  "notes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX "contact_messages_status_idx"
  ON "contact_messages" ("status", "created_at");--> statement-breakpoint
CREATE INDEX "contact_messages_email_idx"
  ON "contact_messages" ("email");
