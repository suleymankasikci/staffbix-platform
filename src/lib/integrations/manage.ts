import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { integrations, type Integration } from "../db/schema";
import { encryptForTenant, decryptForTenant } from "../crypto/encrypt";
import type { WhatsAppCredentials } from "./whatsapp";
import type { SmtpCredentials } from "./customer-smtp";

/**
 * Integration CRUD helpers.
 *
 * The boundary rule: this module is the ONLY place that touches
 * `integrations.secret_blob`. Callers receive `Integration` rows with
 * the blob, plus the decrypted shape on demand via `getDecrypted()`.
 *
 * Strip the blob before serving rows to the UI — never let the
 * ciphertext leave the server.
 *
 * Sprint 18 — writes go through `encryptForTenant`, which produces a
 * version=2 blob keyed by the tenant's DEK. Reads use `decryptForTenant`
 * which still accepts legacy version=1 blobs written before the
 * envelope-encryption migration.
 */

export interface TwitterCredentials {
  accessToken: string;
  refreshToken: string | null;
  /** ISO timestamp when accessToken expires. */
  expiresAt: string | null;
  scope: string;
  userId: string;
  username: string;
}

export interface LinkedInCredentials {
  accessToken: string;
  /** ISO timestamp when accessToken expires. */
  expiresAt: string | null;
  /** URN used as the post author, e.g. "urn:li:person:abc123". */
  authorUrn: string;
  name: string;
}

type SecretByKind = {
  whatsapp: WhatsAppCredentials;
  email_smtp: SmtpCredentials;
  instagram: {
    pageId: string;
    accessToken: string;
    appSecret: string;
    verifyToken: string;
  };
  twitter: TwitterCredentials;
  linkedin: LinkedInCredentials;
};

export type IntegrationKind = keyof SecretByKind;

/**
 * Insert a new integration with the secret encrypted at write time.
 * Returns the row with `secretBlob` stripped (callers should never
 * surface the ciphertext).
 */
export async function createIntegration<K extends IntegrationKind>(args: {
  tenantId: string;
  kind: K;
  displayName: string;
  externalId: string | null;
  secret: SecretByKind[K];
  metadata?: Record<string, unknown>;
}): Promise<Omit<Integration, "secretBlob">> {
  const blob = await encryptForTenant(args.tenantId, args.secret as object);
  const [row] = await db
    .insert(integrations)
    .values({
      tenantId: args.tenantId,
      kind: args.kind,
      displayName: args.displayName,
      externalId: args.externalId,
      secretBlob: blob,
      metadata: args.metadata ?? {},
      status: "active",
    })
    .returning();
  return stripBlob(row);
}

/** Returns the row + decrypted secret for a given (tenant, integration). */
export async function getDecrypted<K extends IntegrationKind>(args: {
  tenantId: string;
  integrationId: string;
  expectedKind: K;
}): Promise<{ row: Integration; secret: SecretByKind[K] } | null> {
  const [row] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.id, args.integrationId),
        eq(integrations.tenantId, args.tenantId),
        eq(integrations.kind, args.expectedKind),
      ),
    )
    .limit(1);
  if (!row) return null;
  const secret = await decryptForTenant<SecretByKind[K]>(
    args.tenantId,
    row.secretBlob,
  );
  return { row, secret };
}

/**
 * Find the tenant's first ACTIVE integration of a given kind + its
 * decrypted secret. Used by the approval dispatcher to locate the
 * social token to publish with. Returns null when none is connected.
 */
export async function getActiveByKind<K extends IntegrationKind>(args: {
  tenantId: string;
  kind: K;
}): Promise<{ row: Integration; secret: SecretByKind[K] } | null> {
  const [row] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.tenantId, args.tenantId),
        eq(integrations.kind, args.kind),
        eq(integrations.status, "active"),
      ),
    )
    .orderBy(desc(integrations.createdAt))
    .limit(1);
  if (!row) return null;
  const secret = await decryptForTenant<SecretByKind[K]>(
    args.tenantId,
    row.secretBlob,
  );
  return { row, secret };
}

/**
 * Lookup by provider-side identifier — used by inbound webhook routers.
 * Example: WhatsApp event arrives with phone_number_id="123…", we find
 * the matching integration to recover the tenantId + accessToken.
 */
export async function findByExternalId<K extends IntegrationKind>(args: {
  kind: K;
  externalId: string;
}): Promise<{ row: Integration; secret: SecretByKind[K] } | null> {
  const [row] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.kind, args.kind),
        eq(integrations.externalId, args.externalId),
      ),
    )
    .limit(1);
  if (!row) return null;
  const secret = await decryptForTenant<SecretByKind[K]>(
    row.tenantId,
    row.secretBlob,
  );
  return { row, secret };
}

export async function listIntegrations(
  tenantId: string,
): Promise<Array<Omit<Integration, "secretBlob">>> {
  const rows = await db
    .select()
    .from(integrations)
    .where(eq(integrations.tenantId, tenantId))
    .orderBy(desc(integrations.createdAt));
  return rows.map(stripBlob);
}

export async function markVerified(integrationId: string): Promise<void> {
  await db
    .update(integrations)
    .set({
      lastVerifiedAt: new Date(),
      lastError: null,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, integrationId));
}

export async function markBroken(
  integrationId: string,
  error: string,
): Promise<void> {
  await db
    .update(integrations)
    .set({
      status: "broken",
      lastError: error.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, integrationId));
}

/**
 * Re-encrypt and persist a new secret for an existing integration.
 * Used when an OAuth access token is refreshed (X / Twitter) so the
 * stored blob always holds a usable token. Marks the row verified.
 */
export async function updateSecret<K extends IntegrationKind>(args: {
  tenantId: string;
  integrationId: string;
  secret: SecretByKind[K];
}): Promise<void> {
  const blob = await encryptForTenant(args.tenantId, args.secret as object);
  await db
    .update(integrations)
    .set({
      secretBlob: blob,
      lastVerifiedAt: new Date(),
      lastError: null,
      status: "active",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(integrations.id, args.integrationId),
        eq(integrations.tenantId, args.tenantId),
      ),
    );
}

export async function disconnectIntegration(args: {
  tenantId: string;
  integrationId: string;
}): Promise<boolean> {
  const rows = await db
    .update(integrations)
    .set({ status: "disconnected", updatedAt: new Date() })
    .where(
      and(
        eq(integrations.id, args.integrationId),
        eq(integrations.tenantId, args.tenantId),
      ),
    )
    .returning({ id: integrations.id });
  return rows.length === 1;
}

function stripBlob(row: Integration): Omit<Integration, "secretBlob"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { secretBlob, ...rest } = row;
  return rest;
}
