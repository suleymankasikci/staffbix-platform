import { type NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { brandBibleSources } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { brandBibleIngestQueue } from "@/lib/queue/queues";
import { uploadObject, tenantKey } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Multipart uploads can be moderately large (PDFs ~10 MB). Bump the
// route body size cap. The actual hard limit lives in the reverse
// proxy (Cloudflare) and Railway's ingress (100 MB).
export const maxDuration = 30;

const MAX_PASTE_CHARS = 1_000_000; // 1 MB-ish of UTF-8 text
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

const ACCEPTED_MIME: Record<string, "pdf" | "docx"> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};

/**
 * GET /api/brand-bible
 *
 * Lists sources for the caller's tenant, newest first. Does NOT return
 * `raw_text` — too heavy for a list view. Pull a single source detail
 * to get its text.
 */
export async function GET(): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "GET /api/brand-bible",
  });
  if (t) return t;

  const rows = await db
    .select({
      id: brandBibleSources.id,
      title: brandBibleSources.title,
      kind: brandBibleSources.kind,
      status: brandBibleSources.status,
      sizeBytes: brandBibleSources.sizeBytes,
      chunkCount: brandBibleSources.chunkCount,
      errorMessage: brandBibleSources.errorMessage,
      createdAt: brandBibleSources.createdAt,
      updatedAt: brandBibleSources.updatedAt,
    })
    .from(brandBibleSources)
    .where(eq(brandBibleSources.tenantId, session.tenantId))
    .orderBy(desc(brandBibleSources.createdAt))
    .limit(500);

  return NextResponse.json({ sources: rows });
}

/**
 * POST /api/brand-bible
 *
 * Two body shapes:
 *   - `multipart/form-data` with `file` (PDF/DOCX) + optional `title`
 *   - `application/json` with `{ kind: "paste", title, text }`
 *
 * On success returns the new source row with `status: 'uploaded'` and
 * a job enqueued on `brand-bible-ingest`. The UI polls GET to track
 * status progression (`parsing` → `embedding` → `ready` / `failed`).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "POST /api/brand-bible",
  });
  if (t) return t;

  const contentType = req.headers.get("content-type") ?? "";

  // ── JSON branch: paste OR url ──────────────────────────────────────────
  if (contentType.includes("application/json")) {
    type JsonBody = {
      kind?: string;
      title?: string;
      text?: string;
      url?: string;
    };
    let body: JsonBody;
    try {
      body = (await req.json()) as JsonBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // URL source — the worker fetches + parses it (SSRF-guarded). We
    // only do shape validation here; the real fetch happens off the
    // request path so a slow page never blocks the API response.
    if (body.kind === "url") {
      const urlTitle = typeof body.title === "string" ? body.title.trim() : "";
      const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
      if (!urlTitle || urlTitle.length > 200) {
        return NextResponse.json(
          { error: "Title is required (max 200 chars)." },
          { status: 400 },
        );
      }
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(rawUrl);
      } catch {
        return NextResponse.json({ error: "Enter a valid URL." }, { status: 400 });
      }
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return NextResponse.json(
          { error: "Only http/https URLs are supported." },
          { status: 400 },
        );
      }

      const [urlSource] = await db
        .insert(brandBibleSources)
        .values({
          tenantId: session.tenantId,
          title: urlTitle,
          kind: "url",
          status: "uploaded",
          sizeBytes: 0,
          metadata: { url: parsedUrl.toString() },
        })
        .returning();

      await brandBibleIngestQueue.add(
        `ingest:${urlSource.id}`,
        { sourceId: urlSource.id, tenantId: session.tenantId },
        { jobId: `ingest:${urlSource.id}` },
      );

      return NextResponse.json({ ok: true, source: urlSource });
    }

    if (body.kind !== "paste") {
      return NextResponse.json(
        { error: "JSON body must have kind='paste' or kind='url'" },
        { status: 400 },
      );
    }
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const text = typeof body.text === "string" ? body.text : "";
    if (!title || title.length > 200) {
      return NextResponse.json({ error: "Title is required (max 200 chars)." }, { status: 400 });
    }
    if (text.trim().length === 0) {
      return NextResponse.json({ error: "Paste content is empty." }, { status: 400 });
    }
    if (text.length > MAX_PASTE_CHARS) {
      return NextResponse.json(
        { error: `Paste is too large (max ${MAX_PASTE_CHARS} chars).` },
        { status: 413 },
      );
    }

    const [source] = await db
      .insert(brandBibleSources)
      .values({
        tenantId: session.tenantId,
        title,
        kind: "paste",
        status: "uploaded",
        sizeBytes: text.length,
        rawText: text,
        metadata: {},
      })
      .returning();

    await brandBibleIngestQueue.add(
      `ingest:${source.id}`,
      { sourceId: source.id, tenantId: session.tenantId },
      { jobId: `ingest:${source.id}` },
    );

    return NextResponse.json({ ok: true, source });
  }

  // ── File upload branch ─────────────────────────────────────────────────
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Content-Type must be multipart/form-data or application/json" },
      { status: 415 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const formTitle = form.get("title");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing `file`." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_FILE_BYTES} bytes).` },
      { status: 413 },
    );
  }
  const mime = file.type;
  const kind = ACCEPTED_MIME[mime];
  if (!kind) {
    return NextResponse.json(
      { error: `Unsupported MIME type ${mime}. Use PDF or DOCX.` },
      { status: 415 },
    );
  }

  const title =
    (typeof formTitle === "string" && formTitle.trim()) ||
    (file.name.replace(/\.(pdf|docx)$/i, "") || "Untitled");
  if (title.length > 200) {
    return NextResponse.json({ error: "Title too long (max 200 chars)." }, { status: 400 });
  }

  // Insert the source row first so we have its ID for the R2 key.
  const [source] = await db
    .insert(brandBibleSources)
    .values({
      tenantId: session.tenantId,
      title,
      kind,
      status: "uploaded",
      sizeBytes: file.size,
      metadata: { original_filename: file.name, mime },
    })
    .returning();

  const key = tenantKey({
    tenantId: session.tenantId,
    sourceId: source.id,
    filename: file.name,
  });

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    await uploadObject({ key, body: bytes, contentType: mime });
  } catch (e) {
    // Roll back the DB row if the R2 upload failed — otherwise we'd
    // have an orphan source that can never be processed.
    await db.delete(brandBibleSources).where(eq(brandBibleSources.id, source.id));
    console.error("[brand-bible] R2 upload failed:", e);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }

  await db
    .update(brandBibleSources)
    .set({ r2Key: key })
    .where(eq(brandBibleSources.id, source.id));

  await brandBibleIngestQueue.add(
    `ingest:${source.id}`,
    { sourceId: source.id, tenantId: session.tenantId },
    { jobId: `ingest:${source.id}` },
  );

  return NextResponse.json({ ok: true, source: { ...source, r2Key: key } });
}
