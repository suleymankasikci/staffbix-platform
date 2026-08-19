-- Sprint 17 — expand security_event_kind with dedicated values so
-- admin/operator API routes stop reusing `tenant.reactivated` as a
-- placeholder. Each ALTER TYPE ... ADD VALUE is its own statement
-- because PostgreSQL forbids combining them in a single transaction.
ALTER TYPE "public"."security_event_kind" ADD VALUE 'settings.updated';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'announcement.created';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'announcement.updated';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'announcement.deleted';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'staff.invited';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'staff.updated';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'staff.removed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'integration.rotated';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'ticket.updated';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'billing.refund.completed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'billing.refund.failed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'billing.invoice.retry';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'report.created';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'report.deleted';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'report.run.completed';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'report.run.failed';
