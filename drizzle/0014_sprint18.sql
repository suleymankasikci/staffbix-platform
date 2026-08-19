-- Sprint 18 — per-tenant DEK envelope encryption + customer-side TOTP.
--
-- (A) Per-tenant DEK rotation
--   New `tenant_keks` table. One wrapped 32-byte DEK per tenant, wrapped
--   under the platform master KEK (TENANT_KEK_MASTER). `version` bumps on
--   rotation; new ciphertext blobs (version=2) embed the DEK version so
--   we can identify which key opened a row during a partial rotation.
--
-- (B) Customer-side TOTP opt-in
--   Three new columns on `users`. Secret is encrypted at rest using the
--   tenant DEK, so even DB read access doesn't recover the TOTP seed.
CREATE TABLE "tenant_keks" (
  "tenant_id" uuid PRIMARY KEY REFERENCES "tenants"("id") ON DELETE CASCADE,
  "dek_wrapped" bytea NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "rotated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "totp_secret_blob" bytea;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "totp_recovery_codes" text[];--> statement-breakpoint
-- New security_event_kind values. Each ALTER TYPE ... ADD VALUE must run
-- in its own statement (PostgreSQL forbids combining them in a single
-- transaction with other DDL on the same enum).
ALTER TYPE "public"."security_event_kind" ADD VALUE 'tenant.dek_rotated';--> statement-breakpoint
ALTER TYPE "public"."security_event_kind" ADD VALUE 'user.totp.disabled';
