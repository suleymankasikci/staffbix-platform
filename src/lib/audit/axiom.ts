/**
 * Axiom ingest transport. Sprint 12 mirrors every `logSecurityEvent`
 * write into Axiom so we have a queryable, long-retention copy of the
 * audit log outside Postgres.
 *
 * Configuration (all from env):
 *   AXIOM_TOKEN   — personal access token or ingest token (Bearer auth)
 *   AXIOM_DATASET — default dataset name (e.g. "staffbix-audit")
 *   AXIOM_ORG_ID  — optional org id; passed via x-axiom-org-id when present
 *
 * If AXIOM_TOKEN is empty we no-op silently so local dev / CI doesn't
 * spam stderr. Errors during fetch are caught and logged at warn level —
 * never thrown — because audit ingest must never break a user request.
 *
 * The endpoint accepts a JSON array of `{_time, ...fields}` objects:
 *   https://www.axiom.co/docs/restapi/ingest
 */

export interface AxiomEvent {
  /** Override target dataset. Defaults to AXIOM_DATASET. */
  dataset?: string;
  /** RFC3339 timestamp. Defaults to now. */
  _time?: string;
  [field: string]: unknown;
}

const AXIOM_URL = "https://api.axiom.co/v1/datasets";

export async function emitAxiom(event: AxiomEvent): Promise<void> {
  const token = process.env.AXIOM_TOKEN;
  if (!token) return; // unconfigured → silent no-op
  const dataset = event.dataset ?? process.env.AXIOM_DATASET;
  if (!dataset) return; // can't ingest without a dataset name

  const orgId = process.env.AXIOM_ORG_ID;

  // Avoid mutating the caller's object.
  const { dataset: _omit, ...fields } = event;
  void _omit;
  const payload = [{ _time: fields._time ?? new Date().toISOString(), ...fields }];

  try {
    const headers: Record<string, string> = {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    };
    if (orgId) headers["x-axiom-org-id"] = orgId;

    const res = await fetch(`${AXIOM_URL}/${encodeURIComponent(dataset)}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // Drain the body so the socket can be reused; ignore content.
      try {
        await res.text();
      } catch {
        /* ignore */
      }
      console.warn(`[axiom] ingest failed status=${res.status} dataset=${dataset}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[axiom] ingest threw: ${msg}`);
  }
}
