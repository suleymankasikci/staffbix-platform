import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import {
  tenantKeks,
  integrations,
  users,
} from "../db/schema";

/**
 * Sprint 18 — per-tenant Data Encryption Keys (DEKs).
 *
 * Envelope encryption: each tenant has a 32-byte DEK stored wrapped
 * (encrypted) by the platform master KEK (`TENANT_KEK_MASTER`). The
 * wrapped form lives in `tenant_keks.dek_wrapped`. Decrypting any
 * tenant-scoped blob requires (1) read access to the wrapped row and
 * (2) the master KEK secret. Compromise of one is not enough.
 *
 * Rotation flow:
 *   1. Read current wrapped DEK → unwrap to oldDek
 *   2. Generate newDek (32 random bytes)
 *   3. For every tenant-scoped encrypted column, decrypt with oldDek
 *      and re-encrypt with newDek
 *   4. In a single transaction: bump version, store wrapped(newDek)
 *
 * Encrypted blob format produced by `encryptForTenant` (version=2):
 *   [1 byte: version=2]
 *   [4 bytes BE: DEK version]
 *   [12 bytes: AES-GCM IV]
 *   [16 bytes: AES-GCM tag]
 *   [N bytes: ciphertext]
 *
 * Legacy blobs created before Sprint 18 use version=1 (master KEK
 * directly) and are still readable via `decryptForTenant` — the
 * dispatcher branches on the first byte. New writes must always use
 * version=2 + per-tenant DEK.
 */

const VERSION_TENANT_DEK = 2;
const WRAPPED_DEK_LENGTH = 12 + 16 + 32; // iv + tag + 32-byte DEK

function masterKey(): Buffer {
  const hex = process.env.TENANT_KEK_MASTER;
  if (!hex || hex.length !== 64 || !/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error(
      "TENANT_KEK_MASTER must be 32 hex bytes (64 chars). Run `openssl rand -hex 32`.",
    );
  }
  return Buffer.from(hex, "hex");
}

/** AES-256-GCM wrap of a 32-byte DEK with the master KEK. */
export function wrapDek(dek: Buffer): Buffer {
  if (dek.length !== 32) throw new Error("DEK must be 32 bytes");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const enc = Buffer.concat([cipher.update(dek), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]); // 12 + 16 + 32 = 60 bytes
}

/** Reverse of `wrapDek` — verifies the GCM tag while decrypting. */
export function unwrapDek(wrapped: Uint8Array | Buffer): Buffer {
  const buf = Buffer.isBuffer(wrapped) ? wrapped : Buffer.from(wrapped);
  if (buf.length !== WRAPPED_DEK_LENGTH) {
    throw new Error(
      `wrapped DEK size invalid: expected ${WRAPPED_DEK_LENGTH}, got ${buf.length}`,
    );
  }
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const dec = createDecipheriv("aes-256-gcm", masterKey(), iv);
  dec.setAuthTag(tag);
  return Buffer.concat([dec.update(enc), dec.final()]);
}

/**
 * Lazily provision a DEK for the tenant. Idempotent — returns the
 * existing DEK if one is already on file, otherwise generates,
 * wraps, and stores a fresh one.
 *
 * Callers that need both the DEK and its current version should use
 * `getTenantDekWithVersion`.
 */
export async function ensureTenantDek(tenantId: string): Promise<Buffer> {
  const [existing] = await db
    .select()
    .from(tenantKeks)
    .where(eq(tenantKeks.tenantId, tenantId))
    .limit(1);
  if (existing) return unwrapDek(existing.dekWrapped);

  const dek = randomBytes(32);
  await db.insert(tenantKeks).values({
    tenantId,
    dekWrapped: wrapDek(dek),
    version: 1,
  });
  return dek;
}

/** Returns the current DEK bytes; lazily provisions if missing. */
export async function getTenantDek(tenantId: string): Promise<Buffer> {
  return ensureTenantDek(tenantId);
}

/** DEK + the integer version recorded on the row (1, 2, …). */
export async function getTenantDekWithVersion(
  tenantId: string,
): Promise<{ dek: Buffer; version: number }> {
  const [row] = await db
    .select()
    .from(tenantKeks)
    .where(eq(tenantKeks.tenantId, tenantId))
    .limit(1);
  if (row) {
    return { dek: unwrapDek(row.dekWrapped), version: row.version };
  }
  // Lazy provision (first encrypt for this tenant).
  const dek = randomBytes(32);
  await db.insert(tenantKeks).values({
    tenantId,
    dekWrapped: wrapDek(dek),
    version: 1,
  });
  return { dek, version: 1 };
}

/* ── version=2 packing helpers used by both this module and encrypt.ts ── */

/** Pack [version=2][4-byte BE dek_version][12-byte iv][16-byte tag][ciphertext]. */
export function packV2Blob(args: {
  dekVersion: number;
  iv: Buffer;
  tag: Buffer;
  ciphertext: Buffer;
}): Buffer {
  if (args.iv.length !== 12) throw new Error("IV must be 12 bytes");
  if (args.tag.length !== 16) throw new Error("tag must be 16 bytes");
  const ver = Buffer.from([VERSION_TENANT_DEK]);
  const dv = Buffer.alloc(4);
  dv.writeUInt32BE(args.dekVersion, 0);
  return Buffer.concat([ver, dv, args.iv, args.tag, args.ciphertext]);
}

export interface UnpackedV2 {
  dekVersion: number;
  iv: Buffer;
  tag: Buffer;
  ciphertext: Buffer;
}

export function unpackV2Blob(blob: Uint8Array | Buffer): UnpackedV2 {
  const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
  if (buf.length < 1 + 4 + 12 + 16) {
    throw new Error("v2 blob too short");
  }
  if (buf[0] !== VERSION_TENANT_DEK) {
    throw new Error(`expected version=${VERSION_TENANT_DEK}, got ${buf[0]}`);
  }
  return {
    dekVersion: buf.readUInt32BE(1),
    iv: buf.subarray(5, 17),
    tag: buf.subarray(17, 33),
    ciphertext: buf.subarray(33),
  };
}

/**
 * Rotate the DEK for a tenant.
 *
 * Generates a fresh 32-byte DEK, decrypts every tenant-scoped encrypted
 * column with the old DEK, re-encrypts with the new DEK, then in one
 * transaction overwrites the wrapped DEK and bumps the version + every
 * affected ciphertext column.
 *
 * In-scope blob columns (Sprint 18):
 *   - `integrations.secret_blob`
 *   - `users.totp_secret_blob`
 *
 * Returns counters per column so the admin endpoint can surface what
 * happened. Throws if anything fails — the rotation is all-or-nothing.
 */
export async function rotateTenantDek(
  tenantId: string,
): Promise<{
  rotated: number;
  integrations: number;
  userTotp: number;
  newVersion: number;
}> {
  const { dek: oldDek, version: oldVersion } =
    await getTenantDekWithVersion(tenantId);
  const newDek = randomBytes(32);
  const newVersion = oldVersion + 1;

  // 1. Re-encrypt all tenant-scoped blobs in memory first. We never
  // overwrite a row's blob in place until the new wrapped DEK is also
  // committed, so a crash midway is recoverable (the old DEK still
  // opens every blob).
  const integrationRows = await db
    .select({
      id: integrations.id,
      secretBlob: integrations.secretBlob,
    })
    .from(integrations)
    .where(eq(integrations.tenantId, tenantId));

  const reencryptedIntegrations: Array<{ id: string; blob: Buffer }> = [];
  for (const row of integrationRows) {
    const plaintext = openAnyVersion(row.secretBlob, oldDek);
    const blob = sealWithDek(plaintext, newDek, newVersion);
    reencryptedIntegrations.push({ id: row.id, blob });
  }

  const userRows = await db
    .select({
      id: users.id,
      totpSecretBlob: users.totpSecretBlob,
    })
    .from(users)
    .where(eq(users.tenantId, tenantId));

  const reencryptedUsers: Array<{ id: string; blob: Buffer }> = [];
  for (const row of userRows) {
    if (!row.totpSecretBlob) continue;
    const plaintext = openAnyVersion(row.totpSecretBlob, oldDek);
    const blob = sealWithDek(plaintext, newDek, newVersion);
    reencryptedUsers.push({ id: row.id, blob });
  }

  // 2. Atomically: write new ciphertext rows, swap the wrapped DEK.
  await db.transaction(async (tx) => {
    for (const r of reencryptedIntegrations) {
      await tx
        .update(integrations)
        .set({ secretBlob: r.blob, updatedAt: new Date() })
        .where(eq(integrations.id, r.id));
    }
    for (const r of reencryptedUsers) {
      await tx
        .update(users)
        .set({ totpSecretBlob: r.blob, updatedAt: new Date() })
        .where(eq(users.id, r.id));
    }
    await tx
      .update(tenantKeks)
      .set({
        dekWrapped: wrapDek(newDek),
        version: newVersion,
        rotatedAt: new Date(),
      })
      .where(eq(tenantKeks.tenantId, tenantId));
  });

  return {
    rotated: reencryptedIntegrations.length + reencryptedUsers.length,
    integrations: reencryptedIntegrations.length,
    userTotp: reencryptedUsers.length,
    newVersion,
  };
}

/**
 * Internal: decrypt a blob written under any supported version.
 *
 * - version=1 → master KEK directly
 * - version=2 → supplied tenant DEK (caller resolves which DEK)
 *
 * Returns the raw plaintext Buffer; callers re-encode as needed.
 */
function openAnyVersion(blob: Uint8Array | Buffer, dek: Buffer): Buffer {
  const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
  const version = buf[0];
  if (version === 1) {
    if (buf.length < 1 + 12 + 16) throw new Error("v1 blob too short");
    const iv = buf.subarray(1, 13);
    const tag = buf.subarray(13, 29);
    const ct = buf.subarray(29);
    const dec = createDecipheriv("aes-256-gcm", masterKey(), iv);
    dec.setAuthTag(tag);
    return Buffer.concat([dec.update(ct), dec.final()]);
  }
  if (version === 2) {
    const { iv, tag, ciphertext } = unpackV2Blob(buf);
    const dec = createDecipheriv("aes-256-gcm", dek, iv);
    dec.setAuthTag(tag);
    return Buffer.concat([dec.update(ciphertext), dec.final()]);
  }
  throw new Error(`unsupported encryption version: ${version}`);
}

/** Internal: seal a plaintext buffer with the given DEK as a v2 blob. */
function sealWithDek(
  plaintext: Buffer,
  dek: Buffer,
  dekVersion: number,
): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dek, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return packV2Blob({ dekVersion, iv, tag, ciphertext: ct });
}
