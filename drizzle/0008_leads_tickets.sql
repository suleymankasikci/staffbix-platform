CREATE TYPE "public"."lead_status" AS ENUM('new', 'queued', 'contacted', 'replied', 'qualified', 'unqualified', 'unsubscribed', 'bounced');--> statement-breakpoint
CREATE TYPE "public"."ticket_channel" AS ENUM('email', 'in_app', 'api', 'widget');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('critical', 'high', 'normal', 'low');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'pending', 'resolved', 'closed');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"company" text,
	"title" text,
	"phone" text,
	"source" text,
	"notes" text,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"owner_user_id" uuid,
	"last_contacted_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" text NOT NULL,
	"subject" text NOT NULL,
	"body_preview" text NOT NULL,
	"channel" "ticket_channel" NOT NULL,
	"priority" "ticket_priority" DEFAULT 'normal' NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"reporter_email" text NOT NULL,
	"reporter_name" text,
	"assigned_worker_id" uuid,
	"assigned_user_id" uuid,
	"conversation_id" uuid,
	"external_thread_id" text,
	"triage" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_worker_id_workers_id_fk" FOREIGN KEY ("assigned_worker_id") REFERENCES "public"."workers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "leads_tenant_email_unique" ON "leads" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "leads_tenant_status_idx" ON "leads" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_thread_unique" ON "support_tickets" USING btree ("tenant_id","channel","external_thread_id") WHERE "support_tickets"."external_thread_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_tenant_code_unique" ON "support_tickets" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "tickets_tenant_status_idx" ON "support_tickets" USING btree ("tenant_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "tickets_tenant_priority_idx" ON "support_tickets" USING btree ("tenant_id","priority","created_at");