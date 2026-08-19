/**
 * X (Twitter) API v2 publisher + identity lookup. Real HTTP calls — no
 * stub. The access token comes from the tenant's stored OAuth
 * integration (see social-oauth.ts for the connect flow).
 */

export interface TweetResult {
  id: string;
  text: string;
  /** True when the draft did not fit and was shortened before posting. */
  truncated: boolean;
}

/**
 * X's `verified_type`. A free account is `none` and caps at 280
 * characters; every paid tier posts long-form. We read it once at
 * connect time and store it on the integration, so publishing does not
 * pay for an extra API round-trip on every post.
 */
export type TwitterVerifiedType = "none" | "blue" | "business" | "government";

/** Character cap for a free (non-verified) account. */
export const TWEET_LIMIT_STANDARD = 280;
/** Character cap for any paid tier. */
export const TWEET_LIMIT_PREMIUM = 25_000;

export function tweetLimitFor(verifiedType: TwitterVerifiedType | null | undefined): number {
  return !verifiedType || verifiedType === "none"
    ? TWEET_LIMIT_STANDARD
    : TWEET_LIMIT_PREMIUM;
}

/**
 * X rewrites every link through t.co and bills it at a flat 23
 * characters no matter how long the original is. Counting the raw
 * string instead would reject drafts that actually fit, and — worse —
 * silently over-trim ones carrying a long URL.
 *
 * https://developer.x.com/en/docs/counting-characters
 */
const TCO_LENGTH = 23;
const URL_RE = /https?:\/\/\S+/g;

export function tweetLength(text: string): number {
  let count = 0;
  let lastIndex = 0;
  URL_RE.lastIndex = 0;
  for (const m of text.matchAll(URL_RE)) {
    count += [...text.slice(lastIndex, m.index)].length + TCO_LENGTH;
    lastIndex = m.index + m[0].length;
  }
  // Spread rather than .length so emoji and other astral characters count
  // as one, which is how X counts them.
  return count + [...text.slice(lastIndex)].length;
}

const ELLIPSIS = "…";

/**
 * Shorten a draft so it fits the account's limit, appending `link` so the
 * reader can still reach the full thing.
 *
 * Free accounts are the reason this exists. An AI worker drafting a post
 * has no notion of 280 characters, and the old behaviour was to throw —
 * so a perfectly good draft became a failed action the owner had to
 * rewrite by hand. Now it publishes the part that fits and points at the
 * rest.
 *
 * Trimming happens at a word boundary where one is available, because
 * cutting mid-word reads like a bug to whoever sees the post.
 */
export function fitTweet(args: {
  text: string;
  limit: number;
  link?: string | null;
}): { text: string; truncated: boolean } {
  const text = args.text.trim();
  const link = args.link?.trim() || null;

  if (tweetLength(text) <= args.limit) return { text, truncated: false };

  // Budget: the limit, minus the ellipsis, minus the link and the space
  // before it when we have one.
  const suffix = link ? ` ${ELLIPSIS} ${link}` : ` ${ELLIPSIS}`;
  const budget = args.limit - tweetLength(suffix);
  if (budget <= 0) {
    // The link alone eats the whole allowance. Post just the link — a
    // bare link still reaches the content, a mangled fragment does not.
    return { text: link ?? text.slice(0, args.limit), truncated: true };
  }

  // Walk back one character at a time. Character-accurate beats a
  // byte-offset guess when the draft mixes emoji, CJK, and URLs.
  const chars = [...text];
  let cut = chars.length;
  while (cut > 0 && tweetLength(chars.slice(0, cut).join("")) > budget) cut--;

  let head = chars.slice(0, cut).join("").trimEnd();
  // Prefer a word boundary, but only if one is close enough that we are
  // not throwing away a meaningful chunk of the draft.
  const lastSpace = head.lastIndexOf(" ");
  if (lastSpace > 0 && lastSpace >= head.length - 20) {
    head = head.slice(0, lastSpace).trimEnd();
  }
  // Don't end on dangling punctuation right before the ellipsis.
  head = head.replace(/[,;:.\-–—]+$/, "").trimEnd();

  return { text: `${head}${suffix}`, truncated: true };
}

/** Resolve the authenticated user (id + username + tier) for the access token. */
export async function getTwitterMe(accessToken: string): Promise<{
  id: string;
  username: string;
  verifiedType: TwitterVerifiedType;
}> {
  const res = await fetch(
    "https://api.twitter.com/2/users/me?user.fields=verified_type",
    { headers: { authorization: `Bearer ${accessToken}` } },
  );
  const json = (await res.json().catch(() => ({}))) as {
    data?: { id?: string; username?: string; verified_type?: string };
  };
  if (!res.ok || !json.data?.id) {
    throw new Error(
      `twitter users/me failed: ${res.status} ${JSON.stringify(json).slice(0, 200)}`,
    );
  }
  const raw = json.data.verified_type;
  // Unknown or absent tier is treated as free. Guessing "premium" would
  // let a 5000-character draft reach the API and fail there instead.
  const verifiedType: TwitterVerifiedType =
    raw === "blue" || raw === "business" || raw === "government" ? raw : "none";
  return { id: json.data.id, username: json.data.username ?? "", verifiedType };
}

/**
 * Post a tweet. Drafts longer than the account's limit are shortened by
 * `fitTweet` rather than rejected; `truncated` on the result says whether
 * that happened, so the caller can record it.
 */
export async function postTweet(args: {
  accessToken: string;
  text: string;
  /** Defaults to the free-account cap — the safe assumption. */
  limit?: number;
  /** Appended when the draft has to be shortened. */
  link?: string | null;
}): Promise<TweetResult> {
  const limit = args.limit ?? TWEET_LIMIT_STANDARD;
  const fitted = fitTweet({ text: args.text, limit, link: args.link });
  if (fitted.text.length === 0) throw new Error("Tweet text is empty.");

  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      authorization: `Bearer ${args.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ text: fitted.text }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: { id?: string; text?: string };
    detail?: string;
    title?: string;
  };
  if (!res.ok || !json.data?.id) {
    const reason = json.detail ?? json.title ?? JSON.stringify(json).slice(0, 200);
    throw new Error(`tweet create failed: ${res.status} ${reason}`);
  }
  return {
    id: json.data.id,
    text: json.data.text ?? fitted.text,
    truncated: fitted.truncated,
  };
}
