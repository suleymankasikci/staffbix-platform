import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { randomBytes } from "node:crypto";

/**
 * Cloudflare R2 client (S3-compatible).
 *
 * One bucket holds everything in MVP. We segregate by key prefix per
 * tenant: `tenants/{tenantId}/brand-bible/{sourceId}/{filename}`. This
 * keeps cross-tenant isolation visible at the storage layer — never list
 * with a tenant-less prefix.
 *
 * For Sprint 4 the bucket is private to the world; uploads are served
 * back through our app proxy (Sprint 5). The optional R2_PUBLIC_URL is
 * stored in env for the day a tenant opts into public sharing.
 */

declare global {
  var __staffbix_r2__: S3Client | undefined;
}

/**
 * Client and bucket name are resolved on first use, not at import.
 *
 * They used to be module-level constants guarded by a `throw`, which
 * meant importing this file with no R2 credentials killed the process.
 * `next build` imports every route to collect its config, so a build
 * machine could not produce a bundle without production storage
 * credentials — CI had none and the build job failed before it ever
 * reached the compile. Deferring the check keeps the same loud failure
 * for anyone who actually calls R2, and lets a build run without
 * secrets it does not need.
 */
function r2Config(): {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
} {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_TENANT;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2 env vars missing. Need R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_TENANT.",
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

/** Lazily-constructed S3 client. Throws if R2 env vars are missing. */
export function r2(): S3Client {
  const cached = globalThis.__staffbix_r2__;
  if (cached) return cached;

  const cfg = r2Config();
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  // Reuse across HMR reloads in dev; in production each process builds
  // its own and keeps it for the process lifetime.
  globalThis.__staffbix_r2__ = client;
  return client;
}

/** Tenant bucket name. Throws if R2 env vars are missing. */
export function r2Bucket(): string {
  return r2Config().bucket;
}

/**
 * Build a tenant-scoped key. Always include the tenantId — listing
 * `tenants/{otherTenant}/...` from a different tenant's request is a
 * tenant-isolation violation regardless of whether bucket ACLs allow it.
 */
export function tenantKey(args: {
  tenantId: string;
  sourceId: string;
  filename: string;
}): string {
  const safeFilename = args.filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
  // Random 8-char nonce — prevents key guessing even if a tenantId leaks.
  const nonce = randomBytes(4).toString("hex");
  return `tenants/${args.tenantId}/brand-bible/${args.sourceId}/${nonce}-${safeFilename}`;
}

export async function uploadObject(args: {
  key: string;
  body: Uint8Array | string;
  contentType: string;
}): Promise<void> {
  await r2().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType,
    }),
  );
}

export async function downloadObject(key: string): Promise<Uint8Array> {
  const res = await r2().send(new GetObjectCommand({ Bucket: r2Bucket(), Key: key }));
  return res.Body!.transformToByteArray();
}

export async function deleteObject(key: string): Promise<void> {
  await r2().send(new DeleteObjectCommand({ Bucket: r2Bucket(), Key: key }));
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await r2().send(new HeadObjectCommand({ Bucket: r2Bucket(), Key: key }));
    return true;
  } catch (e) {
    const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw e;
  }
}

/**
 * List all objects under a tenant prefix — used by audit + on-demand
 * tenant export.
 */
export async function listObjectsByPrefix(prefix: string): Promise<string[]> {
  const out: string[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await r2().send(
      new ListObjectsV2Command({
        Bucket: r2Bucket(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const o of res.Contents ?? []) {
      if (o.Key) out.push(o.Key);
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return out;
}
