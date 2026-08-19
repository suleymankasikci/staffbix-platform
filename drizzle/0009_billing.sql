CREATE TYPE "public"."platform_invoice_status" AS ENUM('draft', 'open', 'paid', 'past_due', 'failed', 'void', 'refunded');--> statement-breakpoint
CREATE TABLE "platform_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"stripe_invoice_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" "platform_invoice_status" DEFAULT 'draft' NOT NULL,
	"hosted_invoice_url" text,
	"pdf_url" text,
	"issued_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"last_failed_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_invoices_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "tenant_ai_spend" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"day" date NOT NULL,
	"total_tokens" bigint DEFAULT 0 NOT NULL,
	"cost_microcents" bigint DEFAULT 0 NOT NULL,
	"call_count" integer DEFAULT 0 NOT NULL,
	"rolled_up_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_invoices" ADD CONSTRAINT "platform_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_ai_spend" ADD CONSTRAINT "tenant_ai_spend_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "platform_invoices_tenant_status_idx" ON "platform_invoices" USING btree ("tenant_id","status","issued_at");--> statement-breakpoint
CREATE INDEX "platform_invoices_issued_idx" ON "platform_invoices" USING btree ("issued_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_ai_spend_tenant_day_unique" ON "tenant_ai_spend" USING btree ("tenant_id","day");--> statement-breakpoint
CREATE INDEX "tenant_ai_spend_day_idx" ON "tenant_ai_spend" USING btree ("day");