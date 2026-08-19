CREATE TYPE "public"."content_brief_status" AS ENUM('drafting', 'ready', 'partially_sent', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."seo_audit_status" AS ENUM('fetching', 'analyzing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "content_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"worker_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"title" text NOT NULL,
	"brief_text" text NOT NULL,
	"target_channels" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"variants_per_channel" integer DEFAULT 1 NOT NULL,
	"status" "content_brief_status" DEFAULT 'drafting' NOT NULL,
	"parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_message" text,
	"action_ids" uuid[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"worker_id" uuid,
	"created_by_user_id" uuid,
	"url" text NOT NULL,
	"status" "seo_audit_status" DEFAULT 'fetching' NOT NULL,
	"fetched_html" text,
	"fetched_text" text,
	"fetch_status" integer,
	"result" jsonb,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_audits" ADD CONSTRAINT "seo_audits_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_audits" ADD CONSTRAINT "seo_audits_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_audits" ADD CONSTRAINT "seo_audits_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_briefs_tenant_idx" ON "content_briefs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "content_briefs_worker_idx" ON "content_briefs" USING btree ("worker_id","created_at");--> statement-breakpoint
CREATE INDEX "content_briefs_status_idx" ON "content_briefs" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "seo_audits_tenant_idx" ON "seo_audits" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "seo_audits_status_idx" ON "seo_audits" USING btree ("tenant_id","status");