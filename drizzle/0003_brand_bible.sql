CREATE TYPE "public"."brand_bible_source_kind" AS ENUM('paste', 'pdf', 'docx', 'url');--> statement-breakpoint
CREATE TYPE "public"."brand_bible_source_status" AS ENUM('uploaded', 'parsing', 'embedding', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "brand_bible_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"token_count" integer NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_bible_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"kind" "brand_bible_source_kind" NOT NULL,
	"status" "brand_bible_source_status" DEFAULT 'uploaded' NOT NULL,
	"r2_key" text,
	"size_bytes" integer,
	"raw_text" text,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_bible_chunks" ADD CONSTRAINT "brand_bible_chunks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_bible_chunks" ADD CONSTRAINT "brand_bible_chunks_source_id_brand_bible_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."brand_bible_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_bible_sources" ADD CONSTRAINT "brand_bible_sources_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_bible_chunks_tenant_idx" ON "brand_bible_chunks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "brand_bible_chunks_source_idx" ON "brand_bible_chunks" USING btree ("source_id","chunk_index");--> statement-breakpoint
CREATE INDEX "brand_bible_sources_tenant_idx" ON "brand_bible_sources" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "brand_bible_sources_status_idx" ON "brand_bible_sources" USING btree ("tenant_id","status");--> statement-breakpoint
-- HNSW index for cosine similarity on the embedding column. Drizzle Kit
-- doesn't render vector opclasses yet, so we add this by hand.
-- Parameters: m=16, ef_construction=64 — pgvector defaults, fine for ≤1M
-- rows. Re-tune when we have load profiles.
CREATE INDEX "brand_bible_chunks_embedding_hnsw" ON "brand_bible_chunks" USING hnsw ("embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 64);