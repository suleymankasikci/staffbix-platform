import { lookup } from "node:dns/promises";
import net from "node:net";
import { htmlToText } from "./parser";

/**
 * Fetch a public URL and return readable plaintext for Brand Bible
 * ingest. Real implementation (no stub):
 *   - http/https only
 *   - SSRF guard: every hostname (initial + each redirect hop) is
 *     resolved and rejected if it maps to a private / loopback /
 *     link-local / cloud-metadata address
 *   - redirects followed manually (max 4 hops) so the guard runs on
 *     every hop, not just the first
 *   - 15 s timeout, 5 MB body cap
 *   - HTML → text via htmlToText; text/plain + markdown passed through;
 *     anything else rejected with a clear error
 */

const MAX_URL_BYTES = 5_000_000; // 5 MB
const FETCH_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 4;

export interface FetchedUrl {
  text: string;
  metadata: Record<string, unknown>;
}

/** True for addresses we must never let the server fetch. */
function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0 || a === 127) return true; // this-host / loopback
    if (a === 10) return true; // private
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true; // loopback / unspecified
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIp(mapped[1]);
  return false;
}

async function assertPublicHost(hostname: string): Promise<void> {
  // Reject raw private IPs passed directly as the host, too.
  if (net.isIP(hostname) && isBlockedIp(hostname)) {
    throw new Error("Refusing to fetch a private/internal address.");
  }
  let resolved;
  try {
    resolved = await lookup(hostname, { all: true });
  } catch {
    throw new Error(`Could not resolve host: ${hostname}`);
  }
  if (resolved.length === 0) {
    throw new Error(`Could not resolve host: ${hostname}`);
  }
  for (const { address } of resolved) {
    if (isBlockedIp(address)) {
      throw new Error("Refusing to fetch a private/internal address.");
    }
  }
}

export async function fetchUrlAsText(rawUrl: string): Promise<FetchedUrl> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL.");
  }

  let current = url;
  let res: Response | null = null;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (current.protocol !== "http:" && current.protocol !== "https:") {
      throw new Error("Only http/https URLs are supported.");
    }
    await assertPublicHost(current.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let hopRes: Response;
    try {
      hopRes = await fetch(current, {
        signal: controller.signal,
        redirect: "manual", // we follow manually to re-check each hop
        headers: {
          "user-agent": "StaffbixBrandBibleBot/1.0 (+https://staffbix.com)",
          accept: "text/html,text/plain,text/markdown;q=0.9,*/*;q=0.1",
        },
      });
    } catch (e) {
      throw new Error(
        `Fetch failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      clearTimeout(timer);
    }

    // Manual redirect handling.
    if (hopRes.status >= 300 && hopRes.status < 400) {
      const location = hopRes.headers.get("location");
      if (!location) throw new Error("Redirect without a Location header.");
      if (hop === MAX_REDIRECTS) throw new Error("Too many redirects.");
      current = new URL(location, current); // resolve relative redirects
      continue;
    }

    res = hopRes;
    break;
  }

  if (!res) throw new Error("Too many redirects.");
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);

  const ctype = (res.headers.get("content-type") ?? "").toLowerCase();
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_URL_BYTES) {
    throw new Error("Remote document too large (max 5 MB).");
  }
  const body = new TextDecoder("utf-8").decode(buf);

  let text: string;
  if (ctype.includes("text/html") || /<html|<body|<!doctype html/i.test(body)) {
    text = htmlToText(body);
  } else if (
    ctype.includes("text/plain") ||
    ctype.includes("text/markdown") ||
    ctype === ""
  ) {
    text = body;
  } else {
    throw new Error(
      `Unsupported content type for URL ingest: ${ctype || "unknown"}. Use an HTML page or plain text.`,
    );
  }

  return {
    text,
    metadata: {
      source_kind: "url",
      url: current.toString(),
      content_type: ctype || null,
      fetched_bytes: buf.byteLength,
    },
  };
}
