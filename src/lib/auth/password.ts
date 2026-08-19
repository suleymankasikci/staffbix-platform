import { hash, verify } from "@node-rs/argon2";

/**
 * Password hashing — argon2id, parameters tuned per OWASP 2023 guidance
 * for a server with ≥ 1 GiB RAM and < 0.5 s acceptable login latency.
 *
 * If you change these, never lower the cost. The hash format records the
 * params, so older hashes will continue to verify; new logins simply land
 * with the updated cost.
 *
 * NB: `@node-rs/argon2` exposes `Algorithm` as a `const enum`. We can't use
 * it directly because tsconfig has `isolatedModules`, so we pass the
 * numeric value (Argon2id = 2) instead.
 */
const PARAMS = {
  algorithm: 2, // Argon2id
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  if (plain.length < 12) {
    throw new Error("Password must be at least 12 characters.");
  }
  if (plain.length > 256) {
    throw new Error("Password is too long.");
  }
  return hash(plain, PARAMS);
}

export async function verifyPassword(
  hashStr: string,
  plain: string,
): Promise<boolean> {
  try {
    return await verify(hashStr, plain);
  } catch {
    // verify() throws on malformed hashes; treat as no-match.
    return false;
  }
}
