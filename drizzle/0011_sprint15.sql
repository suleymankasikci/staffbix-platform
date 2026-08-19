CREATE TYPE "public"."announcement_audience" AS ENUM('all', 'free_trial', 'paid', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."announcement_severity" AS ENUM('info', 'notice', 'critical');--> statement-breakpoint
CREATE TYPE "public"."announcement_status" AS ENUM('draft', 'scheduled', 'live', 'ended');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('owner', 'engineer', 'support', 'analyst');--> statement-breakpoint
CREATE TYPE "public"."staff_status" AS ENUM('active', 'invited', 'suspended');--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"audience" "announcement_audience" DEFAULT 'all' NOT NULL,
	"severity" "announcement_severity" DEFAULT 'info' NOT NULL,
	"status" "announcement_status" DEFAULT 'draft' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "staff_role" DEFAULT 'support' NOT NULL,
	"status" "staff_status" DEFAULT 'active' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcements_status_idx" ON "announcements" USING btree ("status","starts_at");--> statement-breakpoint
INSERT INTO "platform_settings" ("key", "value") VALUES
  ('maintenance_mode', 'false'::jsonb),
  ('signups_open', 'true'::jsonb),
  ('trial_days', '14'::jsonb)
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
INSERT INTO "staff" ("email", "name", "role", "status") VALUES
  ('test@mail.com', 'Alex Morgan', 'owner', 'active')
ON CONFLICT ("email") DO NOTHING;