import { db } from "../db/client";
import { tenants } from "../db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";

/**
 * Deterministic tenant slug from a company name, plus collision
 * resolution. "Acme Co!" → "acme-co", "acme-co" if free, "acme-co-7g3a"
 * if not.
 *
 * Slugs are visible in URLs (`/app/${slug}/...` in Sprint 5) so we keep
 * them ASCII-only, lowercase, and short. Non-Latin scripts collapse to
 * a 4-char random suffix when transliteration would lose meaning.
 */
const ASCII_LETTER = /[a-z]/;

function transliterate(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function randomSuffix(len = 4): string {
  return randomBytes(8).toString("hex").slice(0, len);
}

export async function generateUniqueSlug(name: string): Promise<string> {
  let base = transliterate(name);
  if (!base || !ASCII_LETTER.test(base)) {
    // Non-Latin name with no a-z chars after transliteration — fall back
    // to a stable but anonymous slug.
    base = `tenant-${randomSuffix(6)}`;
  }

  // Try base, base-XXXX, then base-XXXX a few times. Race-safe path is
  // to rely on the UNIQUE constraint at insert time, but pre-checking
  // saves a round-trip in the common case.
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? base : `${base}-${randomSuffix()}`;
    const existing = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
  }
  // Give up trying to be pretty — make it unguessable.
  return `${base}-${randomSuffix(8)}`;
}
