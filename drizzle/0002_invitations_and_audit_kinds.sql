CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'user.profile.updated' BEFORE 'tenant.created';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'user.locale.changed' BEFORE 'tenant.created';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'tenant.invitation.created' BEFORE 'staff.impersonate.start';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'tenant.invitation.revoked' BEFORE 'staff.impersonate.start';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'tenant.invitation.accepted' BEFORE 'staff.impersonate.start';--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invited_by" uuid,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'Editor' NOT NULL,
	"token_hash" text NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"accepted_user_id" uuid,
	CONSTRAINT "invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_user_id_users_id_fk" FOREIGN KEY ("accepted_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_tenant_email_pending_idx" ON "invitations" USING btree ("tenant_id","email") WHERE "invitations"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "invitations_tenant_status_idx" ON "invitations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitations_expires_idx" ON "invitations" USING btree ("expires_at");