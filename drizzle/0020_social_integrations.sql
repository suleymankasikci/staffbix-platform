-- Sprint 84 (audit follow-up) — real social publishing for X (Twitter)
-- and LinkedIn. Adds the two integration kinds (OAuth tokens stored in
-- the encrypted `integrations.secret_blob`) plus audit-event kinds for
-- a connected account and a published post.
--
-- One ALTER TYPE ... ADD VALUE per statement (PostgreSQL requirement).

ALTER TYPE "public"."integration_kind" ADD VALUE IF NOT EXISTS 'twitter';--> statement-breakpoint
ALTER TYPE "public"."integration_kind" ADD VALUE IF NOT EXISTS 'linkedin';--> statement-breakpoint

ALTER TYPE "public"."security_event_kind"
  ADD VALUE IF NOT EXISTS 'social.account.connected';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind"
  ADD VALUE IF NOT EXISTS 'social.post.published';
