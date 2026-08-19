-- Sprint 83 (audit-fix) — promote the hardcoded admin integrations
-- array (src/app/admin/(panel)/integrations/page.tsx) to a DB table
-- so staff can flip status / refresh hints from the panel.

CREATE TYPE "public"."platform_integration_category" AS ENUM (
  'Channel', 'AI provider', 'Payments', 'Email', 'Storage', 'Telemetry'
);--> statement-breakpoint

CREATE TYPE "public"."platform_integration_status" AS ENUM (
  'Live', 'Degraded', 'Disabled'
);--> statement-breakpoint

CREATE TABLE "platform_integrations" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "category" platform_integration_category NOT NULL,
  "status" platform_integration_status NOT NULL DEFAULT 'Live',
  "hint" text NOT NULL DEFAULT '',
  "tenants_installed" integer NOT NULL DEFAULT 0,
  "sort_order" text NOT NULL DEFAULT '500',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX "platform_integrations_status_idx"
  ON "platform_integrations" ("status", "category");--> statement-breakpoint
CREATE INDEX "platform_integrations_category_idx"
  ON "platform_integrations" ("category");--> statement-breakpoint

ALTER TYPE "public"."security_event_kind"
  ADD VALUE IF NOT EXISTS 'platform_integration.updated';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind"
  ADD VALUE IF NOT EXISTS 'plan.updated';--> statement-breakpoint

INSERT INTO platform_integrations (id, name, category, status, hint, tenants_installed, sort_order) VALUES
  ('anthropic',      'Anthropic',           'AI provider'::platform_integration_category, 'Live'::platform_integration_status,     'Primary model provider · p99 480ms', 556, '0100'),
  ('openai',         'OpenAI',              'AI provider'::platform_integration_category, 'Live'::platform_integration_status,     'Secondary failover · p99 612ms',     556, '0110'),
  ('google-ai',      'Google AI',           'AI provider'::platform_integration_category, 'Live'::platform_integration_status,     'Vision + voice · p99 540ms',         312, '0120'),
  ('stripe',         'Stripe',              'Payments'::platform_integration_category,    'Live'::platform_integration_status,     'All paid plans · tax handled',       414, '0200'),
  ('resend',         'Resend',              'Email'::platform_integration_category,       'Live'::platform_integration_status,     'Transactional + report delivery',    556, '0300'),
  ('expo-push',      'Expo push',           'Channel'::platform_integration_category,     'Live'::platform_integration_status,     'Mobile push (iOS + Android)',        318, '0400'),
  ('whatsapp-cloud', 'WhatsApp Cloud API',  'Channel'::platform_integration_category,     'Live'::platform_integration_status,     'Direct Meta integration',            247, '0410'),
  ('twilio-voice',   'Twilio Voice',        'Channel'::platform_integration_category,     'Degraded'::platform_integration_status, 'EU region latency spike',             84, '0420'),
  ('shopify',        'Shopify Admin API',   'Channel'::platform_integration_category,     'Live'::platform_integration_status,     'Brand Bible source + listing ops',   188, '0430'),
  ('r2',             'Cloudflare R2',       'Storage'::platform_integration_category,     'Live'::platform_integration_status,     'Object storage · 12 TB stored',      556, '0500'),
  ('sentry',         'Sentry',              'Telemetry'::platform_integration_category,   'Live'::platform_integration_status,     'Error tracking · APM',                 0, '0600'),
  ('honeycomb',      'Honeycomb',           'Telemetry'::platform_integration_category,   'Disabled'::platform_integration_status, 'Not active in production',             0, '0610')
ON CONFLICT (id) DO NOTHING;
