/**
 * Brand Bible chunker.
 *
 * Splits a document into ~`targetTokens`-sized chunks with `overlap`
 * tokens of bleed between consecutive chunks. The "token" unit here is
 * an approximation: 1 token ≈ 4 characters (a calibration that holds up
 * within ±10% for English/Turkish on `text-embedding-3-small`). We chose
 * to skip a real tokenizer dep (tiktoken) because:
 *   - It bundles a ~1MB WASM blob into the worker.
 *   - The chunker doesn't need an exact count; it needs a stable bucket
 *     size so chunks fit comfortably under the model's 8k input limit.
 *   - The final `token_count` we store in the DB is recalculated using
 *     the *actual* usage value returned by OpenAI's embeddings API, so
 *     no estimate is ever persisted.
 *
 * The split prefers paragraph boundaries (\n\n), falls back to sentence
 * endings (`. `), then word boundaries, and only character-splits as a
 * last resort (extremely long unbroken strings — e.g. base64 dumps).
 *
 * Each chunk has the source title injected as a markdown H2 at the top,
 * so the embedding captures "this passage is from {title}" context.
 */

export interface Chunk {
  index: number;
  text: string;
  approxTokens: number;
}

export interface ChunkOptions {
  targetTokens?: number;
  overlap?: number;
  title?: string;
}

const CHARS_PER_TOKEN = 4;

export function chunkText(input: string, opts: ChunkOptions = {}): Chunk[] {
  const target = opts.targetTokens ?? 800;
  const overlap = opts.overlap ?? 100;
  const header = opts.title ? `## ${opts.title}\n\n` : "";

  const targetChars = target * CHARS_PER_TOKEN - header.length;
  const overlapChars = overlap * CHARS_PER_TOKEN;

  if (targetChars <= 0) {
    throw new Error("chunkText: title is too long to fit in a single chunk header");
  }
  if (overlapChars >= targetChars) {
    throw new Error("chunkText: overlap must be less than target");
  }

  const text = input.trim();
  if (text.length === 0) return [];

  const out: Chunk[] = [];
  let cursor = 0;
  let idx = 0;

  while (cursor < text.length) {
    const remaining = text.length - cursor;
    if (remaining <= targetChars) {
      const body = text.slice(cursor).trim();
      if (body) {
        const full = header + body;
        out.push({ index: idx++, text: full, approxTokens: Math.ceil(full.length / CHARS_PER_TOKEN) });
      }
      break;
    }

    const windowEnd = cursor + targetChars;
    const slice = text.slice(cursor, windowEnd);

    // Prefer to end at a paragraph break inside the window.
    let breakAt = lastIndexOfAny(slice, ["\n\n"], 0.5);
    if (breakAt < 0) breakAt = lastIndexOfAny(slice, [". ", ".\n", "? ", "! "], 0.5);
    if (breakAt < 0) breakAt = slice.lastIndexOf(" ", slice.length - 1);
    if (breakAt < 0 || breakAt < slice.length * 0.3) {
      // No reasonable boundary — hard-cut at window.
      breakAt = slice.length;
    } else {
      // breakAt is the index of the last character to KEEP. Add 1 so we
      // include the boundary character itself when it's `\n\n` or `. `.
      breakAt = breakAt + 1;
    }

    const body = text.slice(cursor, cursor + breakAt).trim();
    if (body) {
      const full = header + body;
      out.push({ index: idx++, text: full, approxTokens: Math.ceil(full.length / CHARS_PER_TOKEN) });
    }

    // Advance the cursor by (breakAt - overlap), so the next chunk
    // overlaps the tail of this one. Bound to at least 1 char of forward
    // progress so we never loop.
    const advance = Math.max(1, breakAt - overlapChars);
    cursor += advance;
  }

  return out;
}

/**
 * `slice.lastIndexOf(needle)` but only accept matches in the rightmost
 * `(1 - minFraction)` of the slice. We want chunks of *roughly* the
 * target size; accepting a break at character 5 of a 3200-char window
 * would produce a 5-char chunk.
 */
function lastIndexOfAny(slice: string, needles: string[], minFraction: number): number {
  const minIdx = Math.floor(slice.length * minFraction);
  let best = -1;
  for (const n of needles) {
    const i = slice.lastIndexOf(n);
    if (i >= minIdx && i > best) best = i;
  }
  return best;
}
