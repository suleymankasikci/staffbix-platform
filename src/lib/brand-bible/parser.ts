import type { Buffer } from "node:buffer";

/**
 * Document parsers for the Brand Bible ingest pipeline.
 *
 * Supported kinds:
 *   - `paste` — input is plain text, returned as-is after normalization.
 *   - `pdf`   — `pdf-parse` extracts text page-by-page.
 *   - `docx`  — `mammoth` extracts raw text (no styling).
 *
 * All parsers normalize whitespace identically so the chunker sees a
 * predictable representation regardless of source.
 */

export type SupportedKind = "paste" | "pdf" | "docx";

export interface ParsedDocument {
  /** The full plaintext, ready to feed into the chunker. */
  text: string;
  /** Source-format-specific metadata: page count, word count, etc. */
  metadata: Record<string, unknown>;
}

export async function parseDocument(args: {
  kind: SupportedKind;
  bytes?: Uint8Array;
  paste?: string;
}): Promise<ParsedDocument> {
  switch (args.kind) {
    case "paste": {
      if (typeof args.paste !== "string") {
        throw new Error("parseDocument: paste kind requires `paste` string");
      }
      const text = normalize(args.paste);
      return { text, metadata: { source_kind: "paste" } };
    }

    case "pdf": {
      if (!args.bytes) throw new Error("parseDocument: pdf kind requires `bytes`");
      // pdf-parse v2 exports a PDFParse class (constructor takes a load
      // params object with `data: Uint8Array`). Different API from v1's
      // default-function form — keep this import path scoped to here so
      // a future swap to another lib is a single-file edit.
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: args.bytes });
      try {
        const result = await parser.getText();
        return {
          text: normalize(result.text),
          metadata: {
            source_kind: "pdf",
            pages: result.total,
          },
        };
      } finally {
        await parser.destroy();
      }
    }

    case "docx": {
      if (!args.bytes) throw new Error("parseDocument: docx kind requires `bytes`");
      const mammoth = (await import("mammoth")).default;
      const buf = toNodeBuffer(args.bytes);
      const res = await mammoth.extractRawText({ buffer: buf });
      return {
        text: normalize(res.value),
        metadata: {
          source_kind: "docx",
          warnings: res.messages.map((m) => m.message),
        },
      };
    }

    default: {
      const _exhaust: never = args.kind;
      throw new Error(`Unsupported kind: ${String(_exhaust)}`);
    }
  }
}

/**
 * Convert an HTML document to readable plaintext for the chunker.
 *
 * Real extraction (not a stub): drops head/script/style/template/svg
 * blocks, turns block-level closers + <br> into newlines so paragraph
 * structure survives, strips remaining tags, decodes HTML entities, then
 * normalizes whitespace the same way the other parsers do. Used by the
 * URL ingest path (`fetch-url.ts`).
 */
export function htmlToText(html: string): string {
  let s = html;
  // Strip non-content blocks entirely (including their inner text).
  s = s.replace(/<head[\s\S]*?<\/head>/gi, " ");
  s = s.replace(
    /<(script|style|noscript|template|svg|iframe)\b[\s\S]*?<\/\1>/gi,
    " ",
  );
  // Comments.
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  // Preserve structure: block closers + line breaks → newlines.
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(
    /<\/(p|div|section|article|header|footer|li|ul|ol|tr|table|h[1-6]|blockquote|pre)>/gi,
    "\n",
  );
  // Drop every remaining tag.
  s = s.replace(/<[^>]+>/g, " ");
  // Decode entities, then normalize whitespace.
  s = decodeHtmlEntities(s);
  return normalize(s);
}

/** Decode the HTML entities that survive tag stripping. */
function decodeHtmlEntities(s: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    mdash: "—",
    ndash: "–",
    hellip: "…",
    rsquo: "’",
    lsquo: "‘",
    ldquo: "“",
    rdquo: "”",
  };
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      safeFromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => safeFromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => named[name] ?? m);
}

function safeFromCodePoint(cp: number): string {
  if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return "";
  try {
    return String.fromCodePoint(cp);
  } catch {
    return "";
  }
}

/**
 * Collapse \r\n, runs of spaces, and leading/trailing whitespace. Keep
 * paragraph breaks (double newlines) intact — they're a useful signal
 * for the chunker.
 */
function normalize(s: string): string {
  return s
    .replace(/\r\n?/g, "\n") //  CRLF / CR → LF
    .replace(/ /g, " ") // nbsp → regular space
    .replace(/[ \t]+/g, " ") //   collapse runs of spaces/tabs
    .replace(/\n{3,}/g, "\n\n") // collapse runs of newlines
    .trim();
}

function toNodeBuffer(bytes: Uint8Array): Buffer {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Buffer } = require("node:buffer") as typeof import("node:buffer");
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}
