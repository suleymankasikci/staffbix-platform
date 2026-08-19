-- Sprint 83 — audit-fix sprint. Expand security_event_kind so every AI
-- tool writes a dedicated enum value instead of co-opting
-- `tenant.reactivated`. Adds one missing brand-bible enum kind too
-- (L-20 from the project audit).
--
-- Each ALTER TYPE ... ADD VALUE is its own statement — PostgreSQL
-- forbids combining them in a single transaction.

-- L-20: brand bible source deletion audit.
ALTER TYPE "public"."security_event_kind" ADD VALUE 'brand_bible.source.deleted';--> statement-breakpoint

-- M-13: dedicated kinds for every AI tool subject. Ordering follows
-- the role catalog so this migration reads like a worklog.

-- Customer support / sales / SDR / content / SEO / social / community
ALTER TYPE "public"."security_event_kind" ADD VALUE 'refund.processed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'conversation.escalated';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'gdpr.request.received';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'lead.created';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'lead.qualified';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'lead.meeting.booked';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'lead.followup.queued';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'content.brief.created';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'seo.audit.completed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'social.reply.queued';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'community.member.welcomed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'community.moderation.flagged';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'kb.update.proposed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'affiliate.code.created';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'account.expansion.tracked';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'onboarding.step.recorded';--> statement-breakpoint

-- Finance: bookkeeping / invoice / cashflow
ALTER TYPE "public"."security_event_kind" ADD VALUE 'bookkeeping.entry';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'invoice.created';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'invoice.reminder.sent';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'cashflow.projection';--> statement-breakpoint

-- HR / exec / IT
ALTER TYPE "public"."security_event_kind" ADD VALUE 'applicant.tracked';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'inbox.triaged';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'meeting.brief.generated';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'it.ticket.opened';--> statement-breakpoint

-- Analytics layer
ALTER TYPE "public"."security_event_kind" ADD VALUE 'ba.recommendation.generated';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'ceo.weekly.framed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'ceo.decision.logged';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'sa.review.generated';--> statement-breakpoint

-- Legal / translator / PR / visual / voice / backlink / marketplace / ads
ALTER TYPE "public"."security_event_kind" ADD VALUE 'legal.document.drafted';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'legal.clause.reviewed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'translation.created';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'translator.glossary.built';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'pr.release.drafted';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'pr.pitch.drafted';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'design.brief.created';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'design.variants.specced';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'voice.call.summarized';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'voice.transfer.requested';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'backlink.prospect.scored';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'backlink.diversity.checked';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'marketplace.reprice.computed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'marketplace.listing.optimized';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'ad.campaign.planned';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'ad.compliance.checked';--> statement-breakpoint

-- Executive cadence: GM weekly/Friday, ops lead, product / marketing /
-- sales directors, video, brand, event, podcast, webinar.
ALTER TYPE "public"."security_event_kind" ADD VALUE 'gm.weekly.planned';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'gm.friday.reviewed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'ops.load.assessed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'ops.runbook.composed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'pm.spec.drafted';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'pm.release.notes.drafted';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'md.channel.reviewed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'md.experiment.proposed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'sd.pipeline.forecast';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'sd.sdr.coached';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'video.clips.planned';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'video.captions.generated';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'brand.voice.scored';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'brand.update.proposed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'event.sequence.planned';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'event.recording.repurposed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'podcast.shownotes.drafted';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'podcast.invite.drafted';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'webinar.qa.triaged';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'webinar.drip.drafted';--> statement-breakpoint

-- Sales engineering / proposal / renewal / partnership / listing /
-- purchasing / logistics / inventory / vendor / QA / project / tier2 /
-- live chat / feedback / concierge / tutor / receptionist / tax /
-- procurement / chef / recruiter.
ALTER TYPE "public"."security_event_kind" ADD VALUE 'se.question.answered';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'se.integration.outlined';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'proposal.rfp.drafted';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'proposal.sow.drafted';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'renewal.churn.scored';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'renewal.play.drafted';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'partnership.partner.scored';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'partnership.proposal.drafted';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'listing.property.drafted';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'listing.inquiry.scored';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'purchasing.quotes.requested';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'purchasing.quotes.compared';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'logistics.shipment.triaged';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'logistics.email.drafted';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'inventory.reorder.evaluated';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'inventory.demand.forecast';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'vendor.performance.scored';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'vendor.renegotiation.drafted';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'qa.bug.triaged';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'qa.release.evaluated';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'pc.blockers.detected';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'pc.status.compiled';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'tier2.escalation.evaluated';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'tier2.recurring.documented';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'livechat.greeting.composed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'livechat.intent.scored';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'feedback.themes.clustered';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'feedback.digest.compiled';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'concierge.options.recommended';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'concierge.booking.evaluated';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'tutor.hint.generated';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'tutor.parent.update';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'receptionist.slot.evaluated';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'receptionist.reminder.composed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'tax.expense.categorized';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'tax.package.compiled';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'procurement.saas.audited';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'procurement.outreach.drafted';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'chef.menu.described';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'chef.allergens.checked';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'recruiter.candidate.scored';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'recruiter.outreach.drafted';

-- NOTE: the legacy `tenant.reactivated` rows that carry a proper
-- `subject` field cannot be rewritten here. Postgres forbids casting
-- to an enum value that was ADDED in the same transaction. The
-- backfill is a one-off SQL script — run after this migration commits.
-- See `scripts/sprint83-backfill.sql`.
