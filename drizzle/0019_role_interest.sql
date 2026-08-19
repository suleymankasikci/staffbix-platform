-- Sprint 84 (audit follow-up) — customer "Notify me" interest on a
-- roadmap (q3) catalog role. Recorded in the security-events ledger
-- under a dedicated kind so the team can gauge demand per role.
--
-- One ALTER TYPE ... ADD VALUE per statement (PostgreSQL requirement).

ALTER TYPE "public"."security_event_kind"
  ADD VALUE IF NOT EXISTS 'catalog.role.interest';
