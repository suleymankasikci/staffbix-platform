/**
 * Shared helpers for the platform-admin write routes added in Sprint 14.
 *
 * Each handler follows the same shape:
 *   1. requireAdmin() → 401 if missing
 *   2. rateLimitOr429("api", "admin:<userId>") → 429 if throttled
 *   3. UUID validation on the [id] param → 400 if malformed
 *   4. perform the write inside a try/catch
 *   5. logSecurityEvent(...) for every successful side effect
 *
 * The UUID regex accepts the v4 shape Drizzle/Postgres generates. The
 * pre-validation keeps junk URLs from hitting the DB at all (matches the
 * pattern used by the existing GET handlers — see
 * `src/app/api/admin/tenants/[id]/route.ts`).
 */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Escape a single value for a CSV cell. Per RFC 4180:
 *  - wrap in double quotes whenever the value contains "," | '"' | "\n" | "\r"
 *  - inner double quotes are doubled
 * Always returns a string. Null/undefined → "".
 */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : String(v);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Join a row of cells into a single CSV line (no trailing newline). */
export function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}
