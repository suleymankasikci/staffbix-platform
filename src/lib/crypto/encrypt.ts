import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import {
  getTenantDek,
  getTenantDekWithVersion,
  packV2Blob,
  unpackV2Blob,
} from "./dek";

/**
 * Symmetric secret encryption for tenant-scoped ciphertext columns
 * (e.g. `integrations.secret_blob`, `users.totp_secret_blob`).
 *
 * Two formats coexist:
 *
 *   version=1 (legacy, pre-Sprint 18)
 *     [1 byte: version=1] [12 bytes: IV] [16 bytes: GCM tag] [ciphertext]
 *     Key: TENANT_KEK_MASTER directly.
 *
 *   version=2 (Sprint 18 — envelope encryption)
 *     [1 byte: version=2] [4 bytes BE: dek_version]
 *     [12 bytes: IV] [16 bytes: GCM tag] [ciphertext]
 *     Key: per-tenant DEK (wrapped under TENANT_KEK_MASTER in
 *     `tenant_keks.dek_wrapped`).
 *
 * Read-side: `decryptForTenant` dispatches on the first byte. version=1
 * blobs continue to decrypt via the master KEK so existing rows keep
 * working without a forced rotation.
 *
 * Write-side: prefer `encryptForTenant`. The version=1 helpers below are
 * deprecated and kept only for backward-compat tests; do not introduce
 * new callers.
 */

const VERSION_MASTER_KEK = 1;
const VERSION_TENANT_DEK = 2;

function masterKey(): Buffer {
  const hex = process.env.TENANT_KEK_MASTER;
  if (!hex || hex.length !== 64 || !/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error(
      "TENANT_KEK_MASTER must be 32 hex bytes (64 chars). Run `openssl rand -hex 32`.",
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * @deprecated Sprint 18 — use `encryptForTenant(tenantId, ...)`. This
 * helper writes a version=1 blob keyed by the master KEK directly with
 * no tenant scoping, which means key rotation requires every tenant's
 * rows to be re-encrypted together. Only kept so legacy callers and
 * fixtures continue to compile.
 */
export function encryptSecret(plaintext: object | string): Uint8Array {
  const key = masterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data =
    typeof plaintext === "string"
      ? Buffer.from(plaintext, "utf8")
      : Buffer.from(JSON.stringify(plaintext), "utf8");
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([VERSION_MASTER_KEK]), iv, tag, enc]);
}

/**
 * @deprecated See `encryptSecret`. Use `decryptForTenantString` so that
 * version=1 and version=2 blobs are transparently handled.
 */
export function decryptSecretString(blob: Uint8Array | Buffer): string {
  const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
  if (buf.length < 1 + 12 + 16) {
    throw new Error("encrypted blob is too short");
  }
  const version = buf[0];
  if (version !== VERSION_MASTER_KEK) {
    throw new Error(
      `decryptSecretString only handles version=1; got ${version} — call decryptForTenantString`,
    );
  }
  const iv = buf.subarray(1, 13);
  const tag = buf.subarray(13, 29);
  const ciphertext = buf.subarray(29);
  const key = masterKey();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return dec.toString("utf8");
}

/** @deprecated Use `decryptForTenant`. */
export function decryptSecret<T = unknown>(blob: Uint8Array | Buffer): T {
  return JSON.parse(decryptSecretString(blob)) as T;
}

/* ── Sprint 18 — version=2 helpers (per-tenant DEK envelope) ────────── */

/**
 * Encrypt a JSON-serialisable value under the tenant's DEK. Produces a
 * version=2 blob. Lazily provisions the DEK on first use.
 */
export async function encryptForTenant(
  tenantId: string,
  plaintext: object | string,
): Promise<Uint8Array> {
  const { dek, version } = await getTenantDekWithVersion(tenantId);
  const data =
    typeof plaintext === "string"
      ? Buffer.from(plaintext, "utf8")
      : Buffer.from(JSON.stringify(plaintext), "utf8");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dek, iv);
  const ct = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return packV2Blob({ dekVersion: version, iv, tag, ciphertext: ct });
}

/**
 * Decrypt a blob written by either `encryptForTenant` (version=2) or
 * the legacy `encryptSecret` (version=1). Returns the raw UTF-8 string.
 */
export async function decryptForTenantString(
  tenantId: string,
  blob: Uint8Array | Buffer,
): Promise<string> {
  const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
  if (buf.length < 1) throw new Error("blob is empty");
  const version = buf[0];

  if (version === VERSION_MASTER_KEK) {
    // Legacy master-KEK row — fall back to the v1 path so reads keep
    // working through the gradual re-encrypt rollout.
    return decryptSecretString(buf);
  }

  if (version === VERSION_TENANT_DEK) {
    const { iv, tag, ciphertext } = unpackV2Blob(buf);
    const dek = await getTenantDek(tenantId);
    const dec = createDecipheriv("aes-256-gcm", dek, iv);
    dec.setAuthTag(tag);
    const out = Buffer.concat([dec.update(ciphertext), dec.final()]);
    return out.toString("utf8");
  }

  throw new Error(`unsupported encryption version: ${version}`);
}

/** Convenience: JSON.parse the decrypted string. */
export async function decryptForTenant<T = unknown>(
  tenantId: string,
  blob: Uint8Array | Buffer,
): Promise<T> {
  return JSON.parse(await decryptForTenantString(tenantId, blob)) as T;
}
