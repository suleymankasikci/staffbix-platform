CREATE TYPE "public"."integration_kind" AS ENUM('whatsapp', 'email_smtp', 'instagram');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('active', 'paused', 'broken', 'disconnected');--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kind" "integration_kind" NOT NULL,
	"status" "integration_status" DEFAULT 'active' NOT NULL,
	"display_name" text NOT NULL,
	"external_id" text,
	"secret_blob" "bytea" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_verified_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "integrations_tenant_kind_idx" ON "integrations" USING btree ("tenant_id","kind");--> statement-breakpoint
CREATE INDEX "integrations_tenant_status_idx" ON "integrations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_kind_external_id_unique" ON "integrations" USING btree ("kind","external_id") WHERE "integrations"."external_id" IS NOT NULL;