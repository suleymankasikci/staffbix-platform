ALTER TYPE "public"."security_event_kind" ADD VALUE 'api.rate_limited';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'ai.spend_cap_hit';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'plan.upgraded';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'plan.downgraded';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "inbound_email_secret" text;
