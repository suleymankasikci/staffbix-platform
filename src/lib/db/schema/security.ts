import {
  pgTable,
  uuid,
  text,
  timestamp,
  inet,
  jsonb,
  pgEnum,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { tenants } from "./tenants";

/**
 * Immutable append-only log of every security-relevant action.
 * Mirrored to Axiom by the worker (no Sentry — see docs/05 §0).
 *
 * Rule: never UPDATE or DELETE rows here. A retention worker may move
 * rows older than 18 months to cold storage in R2, but the in-DB copy
 * is otherwise eternal.
 */
export const securityEventKindEnum = pgEnum("security_event_kind", [
  "user.signup",
  "user.email_verified",
  "user.login.password_ok",
  "user.login.password_fail",
  "user.login.locked",
  "user.otp.issued",
  "user.otp.ok",
  "user.otp.fail",
  "user.otp.exhausted",
  "user.password.reset_requested",
  "user.password.reset_completed",
  "user.password.changed",
  "user.session.created",
  "user.session.revoked",
  "user.new_device",
  "user.totp.enrolled",
  "user.totp.ok",
  "user.totp.fail",
  "user.banned",
  "user.unbanned",
  "user.profile.updated",
  "user.locale.changed",
  "tenant.created",
  "tenant.suspended",
  "tenant.reactivated",
  "tenant.invitation.created",
  "tenant.invitation.revoked",
  "tenant.invitation.accepted",
  "staff.impersonate.start",
  "staff.impersonate.end",
  // Sprint 12 — API hardening, billing, AI spend caps.
  "api.rate_limited",
  "ai.spend_cap_hit",
  "plan.upgraded",
  "plan.downgraded",
  // Sprint 17 — replace `tenant.reactivated` placeholders in admin
  // and operator routes with dedicated kinds. See drizzle/0013_sprint17.sql.
  "settings.updated",
  "announcement.created",
  "announcement.updated",
  "announcement.deleted",
  "staff.invited",
  "staff.updated",
  "staff.removed",
  "integration.rotated",
  "ticket.updated",
  "billing.refund.completed",
  "billing.refund.failed",
  "billing.invoice.retry",
  "report.created",
  "report.updated",
  "report.deleted",
  "report.run.completed",
  "report.run.failed",
  // Sprint 18 — per-tenant DEK rotation + customer-side TOTP disable.
  "tenant.dek_rotated",
  "user.totp.disabled",
  // Sprint 83 (audit fix) — brand bible source deletion (L-20) +
  // dedicated kinds for every AI tool so we stop reusing
  // `tenant.reactivated` as a placeholder (M-13).
  "brand_bible.source.deleted",
  "refund.processed",
  "conversation.escalated",
  "gdpr.request.received",
  "contact.message.received",
  "team.role_changed",
  "team.member_removed",
  "catalog.role.created",
  "catalog.role.updated",
  "catalog.role.deleted",
  "platform_integration.updated",
  "plan.updated",
  "lead.created",
  "lead.qualified",
  "lead.meeting.booked",
  "lead.followup.queued",
  "content.brief.created",
  "seo.audit.completed",
  "social.reply.queued",
  "community.member.welcomed",
  "community.moderation.flagged",
  "kb.update.proposed",
  "affiliate.code.created",
  "account.expansion.tracked",
  "onboarding.step.recorded",
  "bookkeeping.entry",
  "invoice.created",
  "invoice.reminder.sent",
  "cashflow.projection",
  "applicant.tracked",
  "inbox.triaged",
  "meeting.brief.generated",
  "it.ticket.opened",
  "ba.recommendation.generated",
  "ceo.weekly.framed",
  "ceo.decision.logged",
  "sa.review.generated",
  "legal.document.drafted",
  "legal.clause.reviewed",
  "translation.created",
  "translator.glossary.built",
  "pr.release.drafted",
  "pr.pitch.drafted",
  "design.brief.created",
  "design.variants.specced",
  "voice.call.summarized",
  "voice.transfer.requested",
  "backlink.prospect.scored",
  "backlink.diversity.checked",
  "marketplace.reprice.computed",
  "marketplace.listing.optimized",
  "ad.campaign.planned",
  "ad.compliance.checked",
  "gm.weekly.planned",
  "gm.friday.reviewed",
  "ops.load.assessed",
  "ops.runbook.composed",
  "pm.spec.drafted",
  "pm.release.notes.drafted",
  "md.channel.reviewed",
  "md.experiment.proposed",
  "sd.pipeline.forecast",
  "sd.sdr.coached",
  "video.clips.planned",
  "video.captions.generated",
  "brand.voice.scored",
  "brand.update.proposed",
  "event.sequence.planned",
  "event.recording.repurposed",
  "podcast.shownotes.drafted",
  "podcast.invite.drafted",
  "webinar.qa.triaged",
  "webinar.drip.drafted",
  "se.question.answered",
  "se.integration.outlined",
  "proposal.rfp.drafted",
  "proposal.sow.drafted",
  "renewal.churn.scored",
  "renewal.play.drafted",
  "partnership.partner.scored",
  "partnership.proposal.drafted",
  "listing.property.drafted",
  "listing.inquiry.scored",
  "purchasing.quotes.requested",
  "purchasing.quotes.compared",
  "logistics.shipment.triaged",
  "logistics.email.drafted",
  "inventory.reorder.evaluated",
  "inventory.demand.forecast",
  "vendor.performance.scored",
  "vendor.renegotiation.drafted",
  "qa.bug.triaged",
  "qa.release.evaluated",
  "pc.blockers.detected",
  "pc.status.compiled",
  "tier2.escalation.evaluated",
  "tier2.recurring.documented",
  "livechat.greeting.composed",
  "livechat.intent.scored",
  "feedback.themes.clustered",
  "feedback.digest.compiled",
  "concierge.options.recommended",
  "concierge.booking.evaluated",
  "tutor.hint.generated",
  "tutor.parent.update",
  "receptionist.slot.evaluated",
  "receptionist.reminder.composed",
  "tax.expense.categorized",
  "tax.package.compiled",
  "procurement.saas.audited",
  "procurement.outreach.drafted",
  "chef.menu.described",
  "chef.allergens.checked",
  "recruiter.candidate.scored",
  "recruiter.outreach.drafted",
  // Sprint 84 (audit follow-up) — customer registered interest in a
  // roadmap (q3) role from the hire catalog "Notify me" control.
  "catalog.role.interest",
  // Sprint 84 — real social publishing (X / LinkedIn).
  "social.account.connected",
  "social.post.published",
]);

export const securityEvents = pgTable(
  "security_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    kind: securityEventKindEnum("kind").notNull(),
    ip: inet("ip"),
    userAgent: text("user_agent"),
    payload: jsonb("payload"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("security_events_tenant_idx").on(t.tenantId, t.createdAt),
    index("security_events_user_idx").on(t.userId, t.createdAt),
    index("security_events_kind_idx").on(t.kind, t.createdAt),
  ],
);

/**
 * Sliding-window rate-limit counters. Keyed by `bucket_key` so the same
 * row pattern handles OTP issuance, login attempts, password reset, API
 * routes, etc. Redis is the hot path; this table is for cross-instance
 * authority + an audit-friendly view of who's getting throttled.
 */
export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    // shape: "<scope>:<identifier>:<windowStartEpochSec>"
    // e.g. "otp:user@example.com:1747094400"
    bucketKey: text("bucket_key").primaryKey(),

    count: integer("count").notNull().default(0),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowSeconds: integer("window_seconds").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("rate_limit_window_idx").on(t.windowStart)],
);

export type SecurityEvent = typeof securityEvents.$inferSelect;
export type NewSecurityEvent = typeof securityEvents.$inferInsert;
