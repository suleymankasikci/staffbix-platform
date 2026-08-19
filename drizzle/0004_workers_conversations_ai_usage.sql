CREATE TYPE "public"."ai_call_kind" AS ENUM('embedding', 'chat', 'completion');--> statement-breakpoint
CREATE TYPE "public"."ai_provider" AS ENUM('openai', 'anthropic');--> statement-breakpoint
CREATE TYPE "public"."conversation_channel" AS ENUM('web', 'whatsapp', 'email', 'instagram', 'manual');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('open', 'awaiting_human', 'resolved', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('system', 'user', 'assistant', 'human_agent', 'tool');--> statement-breakpoint
CREATE TYPE "public"."worker_autonomy" AS ENUM('auto', 'approve', 'suggest');--> statement-breakpoint
CREATE TYPE "public"."worker_status" AS ENUM('active', 'paused', 'terminated');--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"worker_id" uuid,
	"conversation_id" uuid,
	"provider" "ai_provider" NOT NULL,
	"kind" "ai_call_kind" NOT NULL,
	"model" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"cost_microcents" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer,
	"cache_hit" boolean DEFAULT false NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"worker_id" uuid NOT NULL,
	"channel" "conversation_channel" NOT NULL,
	"status" "conversation_status" DEFAULT 'open' NOT NULL,
	"external_id" text,
	"customer" jsonb,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"author_user_id" uuid,
	"cited_chunk_ids" uuid[],
	"model" text,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role_slug" text NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"custom_instructions" text,
	"channels" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"status" "worker_status" DEFAULT 'active' NOT NULL,
	"autonomy" "worker_autonomy" DEFAULT 'approve' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"model_pin" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workers" ADD CONSTRAINT "workers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_tenant_created_idx" ON "ai_usage" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_provider_created_idx" ON "ai_usage" USING btree ("provider","created_at");--> statement-breakpoint
CREATE INDEX "conversations_tenant_status_idx" ON "conversations" USING btree ("tenant_id","status","last_message_at");--> statement-breakpoint
CREATE INDEX "conversations_tenant_worker_idx" ON "conversations" USING btree ("tenant_id","worker_id");--> statement-breakpoint
CREATE INDEX "conversations_external_idx" ON "conversations" USING btree ("tenant_id","channel","external_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_tenant_idx" ON "messages" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "workers_tenant_idx" ON "workers" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "workers_tenant_status_idx" ON "workers" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "workers_tenant_role_unique" ON "workers" USING btree ("tenant_id","role_slug");