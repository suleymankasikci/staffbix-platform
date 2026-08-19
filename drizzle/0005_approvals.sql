CREATE TYPE "public"."worker_action_kind" AS ENUM('web_reply', 'whatsapp_reply', 'email_send', 'social_post');--> statement-breakpoint
CREATE TYPE "public"."worker_action_status" AS ENUM('pending', 'approved', 'sent', 'rejected', 'auto', 'failed');--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"expo_token" text NOT NULL,
	"device_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "push_subscriptions_expo_token_unique" UNIQUE("expo_token")
);
--> statement-breakpoint
CREATE TABLE "worker_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"worker_id" uuid NOT NULL,
	"conversation_id" uuid,
	"draft_message_id" uuid,
	"kind" "worker_action_kind" NOT NULL,
	"status" "worker_action_status" DEFAULT 'pending' NOT NULL,
	"content" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"decision_notes" text,
	"dispatched_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_actions" ADD CONSTRAINT "worker_actions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_actions" ADD CONSTRAINT "worker_actions_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_actions" ADD CONSTRAINT "worker_actions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_actions" ADD CONSTRAINT "worker_actions_draft_message_id_messages_id_fk" FOREIGN KEY ("draft_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_actions" ADD CONSTRAINT "worker_actions_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_tenant_idx" ON "push_subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "worker_actions_tenant_status_idx" ON "worker_actions" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "worker_actions_conversation_idx" ON "worker_actions" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "worker_actions_pending_idx" ON "worker_actions" USING btree ("tenant_id","created_at") WHERE "worker_actions"."status" = 'pending';