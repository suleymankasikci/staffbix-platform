-- Sprint 83 (audit-fix) — promote `src/lib/roles.ts` ROLES array to a
-- DB-backed table so the admin Catalog page can edit roles without a
-- deploy (C-3 + C-9). The seed below mirrors the legacy array exactly;
-- ON CONFLICT DO NOTHING makes re-running idempotent.

CREATE TYPE "public"."role_catalog_status" AS ENUM ('available', 'q3');--> statement-breakpoint
CREATE TYPE "public"."role_catalog_category" AS ENUM (
  'Customer-facing', 'Sales', 'Marketing', 'Operations', 'Finance', 'Leadership'
);--> statement-breakpoint

CREATE TABLE "role_catalog" (
  "slug" text PRIMARY KEY,
  "title" text NOT NULL,
  "category" role_catalog_category NOT NULL,
  "summary" text NOT NULL,
  "channels" text[] NOT NULL DEFAULT '{}'::text[],
  "status" role_catalog_status NOT NULL DEFAULT 'available',
  "sort_order" text NOT NULL DEFAULT '500',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX "role_catalog_status_idx"
  ON "role_catalog" ("status", "category");--> statement-breakpoint
CREATE INDEX "role_catalog_category_idx"
  ON "role_catalog" ("category");--> statement-breakpoint

ALTER TYPE "public"."security_event_kind"
  ADD VALUE IF NOT EXISTS 'catalog.role.created';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind"
  ADD VALUE IF NOT EXISTS 'catalog.role.updated';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind"
  ADD VALUE IF NOT EXISTS 'catalog.role.deleted';--> statement-breakpoint

INSERT INTO role_catalog (slug, title, category, summary, channels, status, sort_order) VALUES
  ('customer-support', 'Customer Support', 'Customer-facing'::role_catalog_category, 'Answers on web chat, WhatsApp, email. Knows your products, policies, and limits.', '{"Web","WhatsApp","Email"}'::text[], 'available'::role_catalog_status, '0100'),
  ('inbound-sales', 'Inbound Sales Closer', 'Sales'::role_catalog_category, 'Qualifies leads, books meetings, follows up. Hands off when a human should.', '{"Web","Email"}'::text[], 'available'::role_catalog_status, '0110'),
  ('social-media', 'Social Media Manager', 'Marketing'::role_catalog_category, 'Drafts posts for IG, X, FB, LinkedIn. Schedules. Replies to comments.', '{"IG","X","FB","LinkedIn"}'::text[], 'available'::role_catalog_status, '0120'),
  ('seo-specialist', 'SEO Specialist', 'Marketing'::role_catalog_category, 'Audits the site, picks keywords, writes the content, fixes the meta.', '{"WordPress","Shopify"}'::text[], 'available'::role_catalog_status, '0130'),
  ('content-writer', 'Content Writer', 'Marketing'::role_catalog_category, 'Long-form blog posts, product descriptions, landing copy in your voice.', '{"CMS","Email"}'::text[], 'available'::role_catalog_status, '0140'),
  ('email-marketer', 'Email Marketer', 'Marketing'::role_catalog_category, 'Builds sequences, segments your list, writes the copy, tracks the opens.', '{"Email"}'::text[], 'available'::role_catalog_status, '0150'),
  ('visual-designer', 'Visual Designer', 'Marketing'::role_catalog_category, 'Brand-aligned creatives for ads, social, posts, and email headers.', '{"IG","FB","Email"}'::text[], 'available'::role_catalog_status, '0160'),
  ('pr-manager', 'PR Manager', 'Marketing'::role_catalog_category, 'Drafts press releases, replies to journalist queries, builds media lists.', '{"Email"}'::text[], 'available'::role_catalog_status, '0170'),
  ('translator', 'Translator', 'Customer-facing'::role_catalog_category, 'Localizes outbound content into 23 languages, voice-matched per market.', '{"Email","Web","CMS"}'::text[], 'available'::role_catalog_status, '0180'),
  ('bookkeeping', 'Bookkeeping Assistant', 'Finance'::role_catalog_category, 'Tracks income, expenses, and invoices. Monthly report to your accountant.', '{"Stripe","Bank"}'::text[], 'available'::role_catalog_status, '0190'),
  ('exec-assistant', 'Executive Assistant', 'Operations'::role_catalog_category, 'Inbox triage, calendar coordination, travel research, meeting prep.', '{"Email","Calendar"}'::text[], 'available'::role_catalog_status, '0200'),
  ('business-analyst', 'Business Analyst', 'Leadership'::role_catalog_category, 'Pulls metrics, flags anomalies, drafts the Monday morning briefing.', '{"Internal"}'::text[], 'available'::role_catalog_status, '0210'),
  ('strategic-advisor', 'Strategic Advisor', 'Leadership'::role_catalog_category, 'Reviews your decisions, asks the hard questions, suggests alternatives.', '{"Internal"}'::text[], 'available'::role_catalog_status, '0220'),
  ('account-manager', 'Account Manager', 'Sales'::role_catalog_category, 'Owns existing customers. Renewals, upsells, check-ins, churn signals.', '{"Email","Web"}'::text[], 'available'::role_catalog_status, '0230'),
  ('customer-onboarder', 'Customer Onboarder', 'Customer-facing'::role_catalog_category, 'Walks new customers through setup. Detects stuck users. Schedules calls.', '{"Email","Web"}'::text[], 'available'::role_catalog_status, '0240'),
  ('it-helper', 'IT Helper', 'Operations'::role_catalog_category, 'Answers tool questions, runs password resets, files tickets to humans.', '{"Slack","Email"}'::text[], 'available'::role_catalog_status, '0250'),
  ('legal-helper', 'Legal Helper', 'Operations'::role_catalog_category, 'Drafts NDAs, reviews supplier contracts, flags unusual clauses for you.', '{"Email"}'::text[], 'available'::role_catalog_status, '0260'),
  ('ceo-advisor', 'CEO Advisor', 'Leadership'::role_catalog_category, 'Reads everything. Frames decisions weekly. Pushes back when you wobble.', '{"Internal"}'::text[], 'available'::role_catalog_status, '0270'),
  ('voice-agent', 'Voice Agent', 'Customer-facing'::role_catalog_category, 'Inbound and outbound calls in 23 languages. Full transcript archive.', '{"Phone"}'::text[], 'available'::role_catalog_status, '0280'),
  ('backlink-ai', 'Backlink AI', 'Marketing'::role_catalog_category, 'Browser-automated outreach for high-quality backlinks. Anti-penalty discipline.', '{"Web"}'::text[], 'available'::role_catalog_status, '0290'),
  ('marketplace-ops', 'Marketplace Ops', 'Operations'::role_catalog_category, 'Amazon, eBay, Etsy listings. Repricing. Customer messaging. Returns.', '{"Amazon","eBay","Etsy"}'::text[], 'available'::role_catalog_status, '0300'),
  ('outbound-sdr', 'Outbound SDR', 'Sales'::role_catalog_category, 'Cold outreach with research per prospect. Sequences, replies, meeting booking.', '{"Email","LinkedIn"}'::text[], 'available'::role_catalog_status, '0310'),
  ('ad-manager', 'Ad Manager', 'Marketing'::role_catalog_category, 'Meta, Google, TikTok campaigns. Bid management. Creative iteration.', '{"Meta","Google","TikTok"}'::text[], 'available'::role_catalog_status, '0320'),
  ('hr-assistant', 'HR Assistant', 'Operations'::role_catalog_category, 'Job posts, candidate screening, interview scheduling, onboarding docs.', '{"Email"}'::text[], 'available'::role_catalog_status, '0330'),
  ('general-manager', 'General Manager', 'Leadership'::role_catalog_category, 'Owns the operating cadence. Reads every report, flags what slips, drafts the weekly plan.', '{"Internal"}'::text[], 'available'::role_catalog_status, '0340'),
  ('ops-lead', 'Operations Lead', 'Leadership'::role_catalog_category, 'Coordinates across roles. Watches load, redistributes work, prevents bottlenecks.', '{"Internal"}'::text[], 'available'::role_catalog_status, '0350'),
  ('product-manager', 'Product Manager', 'Leadership'::role_catalog_category, 'Owns the roadmap. Drafts specs, prioritizes, writes the release notes.', '{"Internal"}'::text[], 'available'::role_catalog_status, '0360'),
  ('marketing-director', 'Marketing Director', 'Leadership'::role_catalog_category, 'Sits above Social, SEO, Ads. Sets the strategy, reviews the work, owns the number.', '{"Internal"}'::text[], 'available'::role_catalog_status, '0370'),
  ('sales-director', 'Sales Director', 'Leadership'::role_catalog_category, 'Pipeline health, forecast, deal review. Sales coaching for the SDR.', '{"Internal"}'::text[], 'available'::role_catalog_status, '0380'),
  ('video-editor', 'Video Editor', 'Marketing'::role_catalog_category, 'Short-form video for IG Reels, TikTok, YouTube Shorts. Captions, cuts, music.', '{"TikTok","YouTube","IG"}'::text[], 'available'::role_catalog_status, '0390'),
  ('brand-manager', 'Brand Manager', 'Marketing'::role_catalog_category, 'Owns Brand Bible coherence across all roles. Flags drift before it ships.', '{"Internal"}'::text[], 'available'::role_catalog_status, '0400'),
  ('community-manager', 'Community Manager', 'Marketing'::role_catalog_category, 'Discord, Slack, forum engagement. Welcomes, escalates, summarizes weekly.', '{"Discord","Slack"}'::text[], 'available'::role_catalog_status, '0410'),
  ('affiliate-manager', 'Affiliate Manager', 'Marketing'::role_catalog_category, 'Recruits affiliates, tracks payouts, handles their support, audits fraud signals.', '{"Email"}'::text[], 'available'::role_catalog_status, '0420'),
  ('event-marketer', 'Event Marketer', 'Marketing'::role_catalog_category, 'Webinars, launches, conferences. Invites, follow-ups, replays, attribution.', '{"Email","Calendar"}'::text[], 'available'::role_catalog_status, '0430'),
  ('influencer-outreach', 'Influencer Outreach', 'Marketing'::role_catalog_category, 'Sources creators, drafts pitches, negotiates rate, tracks deliverables.', '{"Email","IG"}'::text[], 'available'::role_catalog_status, '0440'),
  ('podcast-producer', 'Podcast Producer', 'Marketing'::role_catalog_category, 'Books guests, writes outlines, drafts show notes, repurposes clips for social.', '{"Email"}'::text[], 'available'::role_catalog_status, '0450'),
  ('webinar-host', 'Webinar Host Assistant', 'Marketing'::role_catalog_category, 'Pre-event prep, registrant communication, live Q&A triage, post-event drip.', '{"Email","Zoom"}'::text[], 'available'::role_catalog_status, '0460'),
  ('bdr', 'Business Development Rep', 'Sales'::role_catalog_category, 'Cold outreach with research. Books discovery calls for the closer.', '{"Email","LinkedIn"}'::text[], 'available'::role_catalog_status, '0470'),
  ('sales-engineer', 'Sales Engineer', 'Sales'::role_catalog_category, 'Technical demos, custom proposals, integration questions answered.', '{"Email","Web"}'::text[], 'available'::role_catalog_status, '0480'),
  ('proposal-writer', 'Proposal Writer', 'Sales'::role_catalog_category, 'Drafts RFP responses, custom proposals, SOWs in your voice.', '{"Email","Docs"}'::text[], 'available'::role_catalog_status, '0490'),
  ('renewal-specialist', 'Renewal Specialist', 'Sales'::role_catalog_category, 'Owns renewal cycle. Spots churn risk early. Surfaces save plays.', '{"Email"}'::text[], 'available'::role_catalog_status, '0500'),
  ('partnership-manager', 'Partnership Manager', 'Sales'::role_catalog_category, 'Sources and manages partner relationships. Co-marketing, integrations, joint outreach.', '{"Email","LinkedIn"}'::text[], 'available'::role_catalog_status, '0510'),
  ('listing-manager', 'Listing Manager', 'Sales'::role_catalog_category, 'Real estate listings, photos, virtual tours, inquiry handling, viewing schedule.', '{"Web","Email"}'::text[], 'available'::role_catalog_status, '0520'),
  ('purchasing-agent', 'Purchasing Agent', 'Operations'::role_catalog_category, 'Sources suppliers, requests quotes, tracks deliveries, manages purchase orders.', '{"Email"}'::text[], 'available'::role_catalog_status, '0530'),
  ('logistics-coordinator', 'Logistics Coordinator', 'Operations'::role_catalog_category, 'Shipments, tracking, returns, carrier issues, customer ETA updates.', '{"Email","Web"}'::text[], 'available'::role_catalog_status, '0540'),
  ('inventory-manager', 'Inventory Manager', 'Operations'::role_catalog_category, 'Stock levels, replenishment alerts, demand forecast, deadstock flags.', '{"Internal"}'::text[], 'available'::role_catalog_status, '0550'),
  ('vendor-manager', 'Vendor Manager', 'Operations'::role_catalog_category, 'Contract terms, performance reviews, renegotiations, issue escalation.', '{"Email"}'::text[], 'available'::role_catalog_status, '0560'),
  ('quality-assurance', 'Quality Assurance', 'Operations'::role_catalog_category, 'Test plans, regression checks, bug triage, release sign-off, post-release watch.', '{"Internal"}'::text[], 'available'::role_catalog_status, '0570'),
  ('project-coordinator', 'Project Coordinator', 'Operations'::role_catalog_category, 'Timelines, milestones, blockers, status updates across teams and partners.', '{"Email","Slack"}'::text[], 'available'::role_catalog_status, '0580'),
  ('data-analyst', 'Data Analyst', 'Operations'::role_catalog_category, 'Custom reports, ad-hoc queries, dashboard design, anomaly investigation.', '{"Internal"}'::text[], 'available'::role_catalog_status, '0590'),
  ('tier2-support', 'Tier 2 Support', 'Customer-facing'::role_catalog_category, 'Escalations from Customer Support. Edge cases, refunds, retention saves.', '{"Web","Email"}'::text[], 'available'::role_catalog_status, '0600'),
  ('customer-success', 'Customer Success', 'Customer-facing'::role_catalog_category, 'Health scores, QBRs, expansion plays, proactive churn prevention.', '{"Email","Web"}'::text[], 'available'::role_catalog_status, '0610'),
  ('live-chat', 'Live Chat Specialist', 'Customer-facing'::role_catalog_category, 'Sales-flavored chat on landing pages. Books demos, captures intent, qualifies.', '{"Web"}'::text[], 'available'::role_catalog_status, '0620'),
  ('feedback-analyst', 'Feedback Analyst', 'Customer-facing'::role_catalog_category, 'Mines reviews, tickets, surveys, NPS. Surfaces themes in weekly digest.', '{"Internal"}'::text[], 'available'::role_catalog_status, '0630'),
  ('kb-editor', 'Knowledge Base Editor', 'Customer-facing'::role_catalog_category, 'Writes help articles from tickets. Keeps the docs current as the product moves.', '{"CMS"}'::text[], 'available'::role_catalog_status, '0640'),
  ('concierge', 'Concierge', 'Customer-facing'::role_catalog_category, 'Hotel and hospitality guest service. Recommendations, bookings, local knowledge.', '{"Web","WhatsApp"}'::text[], 'available'::role_catalog_status, '0650'),
  ('tutor', 'Tutor', 'Customer-facing'::role_catalog_category, 'Student check-ins, homework hints, parent updates, progress notes.', '{"Email","Web"}'::text[], 'available'::role_catalog_status, '0660'),
  ('receptionist', 'Receptionist', 'Customer-facing'::role_catalog_category, 'Clinic and salon intake. Appointment booking, reminders, no-show recovery.', '{"Phone","WhatsApp"}'::text[], 'available'::role_catalog_status, '0670'),
  ('invoice-specialist', 'Invoice Specialist', 'Finance'::role_catalog_category, 'Issues invoices, chases payment, applies receipts, escalates aging accounts.', '{"Email","Stripe"}'::text[], 'available'::role_catalog_status, '0680'),
  ('tax-prep', 'Tax Prep Assistant', 'Finance'::role_catalog_category, 'Categorizes expenses, reconciles statements, prepares package for your accountant.', '{"Email","Bank"}'::text[], 'available'::role_catalog_status, '0690'),
  ('cash-flow', 'Cash Flow Analyst', 'Finance'::role_catalog_category, 'Forecast, runway, scenario modeling, weekly variance report.', '{"Internal"}'::text[], 'available'::role_catalog_status, '0700'),
  ('procurement', 'Procurement', 'Finance'::role_catalog_category, 'Negotiates SaaS contracts, reviews renewals, audits unused tools.', '{"Email"}'::text[], 'available'::role_catalog_status, '0710'),
  ('chef-assistant', 'Chef Assistant', 'Marketing'::role_catalog_category, 'Restaurant menu writing, recipe content, dietary tags, allergen disclosure.', '{"CMS","Web"}'::text[], 'available'::role_catalog_status, '0720'),
  ('recruiter', 'Recruiter', 'Operations'::role_catalog_category, 'Sources candidates, screens resumes, schedules interviews, drafts offer letters.', '{"LinkedIn","Email"}'::text[], 'available'::role_catalog_status, '0730')
ON CONFLICT (slug) DO NOTHING;
