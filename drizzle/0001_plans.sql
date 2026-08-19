CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tagline" text NOT NULL,
	"stripe_price_id" text,
	"price_monthly_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"max_workers" integer NOT NULL,
	"max_monthly_ai_dollars" integer NOT NULL,
	"max_channels_per_worker" integer NOT NULL,
	"max_team_seats" integer NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "plans_sort_order_idx" ON "plans" USING btree ("sort_order");--> statement-breakpoint
-- Seed the four MVP plans. IDs are lowercase ASCII (used in tenants.plan_id
-- and as Stripe Product lookups). Display name + tagline shown in admin UI.
-- Stripe price IDs are filled in by `scripts/seed-stripe-prices.ts` once
-- the products exist in Stripe; until then `subscriptions.create` skips
-- the line-item attachment.
INSERT INTO "plans" (id, name, tagline, price_monthly_cents, currency, max_workers, max_monthly_ai_dollars, max_channels_per_worker, max_team_seats, features, is_public, sort_order) VALUES
  ('starter',    'Starter',    'Hire your first worker. WhatsApp + web chat. Brand Bible from one source.',
                                                          4900,  'usd',  1, 50,   2,  3,  '{"brand_bible_docs":25,"ai_models":["gpt-4o-mini"],"approval_modes":["auto","approve","suggest"]}'::jsonb,                                                                   true, 10),
  ('growth',     'Growth',     'Up to 3 workers. All channels. Brand Bible from multiple sources. gpt-4o on tap.',
                                                          14900, 'usd',  3, 250,  4,  10, '{"brand_bible_docs":-1,"ai_models":["gpt-4o-mini","gpt-4o"],"approval_modes":["auto","approve","suggest"]}'::jsonb,         true, 20),
  ('business',   'Business',   'Unlimited workers. Opus-class research mode. Voice agent (Phase 2). Helicone dedicated.',
                                                          49900, 'usd', -1, 1500, -1, -1, '{"brand_bible_docs":-1,"ai_models":["gpt-4o","claude-sonnet-4","claude-opus-4"],"voice_agent":true,"helicone_dedicated":true}'::jsonb, true, 30),
  ('enterprise', 'Enterprise', 'Custom volume, SSO, dedicated tenant. Sales-quoted.',
                                                          0,     'usd', -1, -1,   -1, -1, '{"sso":true,"dedicated_tenant":true,"contract_terms":true}'::jsonb,                                                            false, 40);
--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;
