/**
 * X (Twitter) API v2 publisher + identity lookup. Real HTTP calls — no
 * stub. The access token comes from the tenant's stored OAuth
 * integration (see social-oauth.ts for the connect flow).
 */

export interface TweetResult {
  id: string;
  text: string;
}

/** Resolve the authenticated user (id + username) for the access token. */
export async function getTwitterMe(accessToken: string): Promise<{
  id: string;
  username: string;
}> {
  const res = await fetch("https://api.twitter.com/2/users/me", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: { id?: string; username?: string };
  };
  if (!res.ok || !json.data?.id) {
    throw new Error(
      `twitter users/me failed: ${res.status} ${JSON.stringify(json).slice(0, 200)}`,
    );
  }
  return { id: json.data.id, username: json.data.username ?? "" };
}

const MAX_TWEET_CHARS = 280;

/** Post a tweet. Returns the created tweet id. */
export async function postTweet(args: {
  accessToken: string;
  text: string;
}): Promise<TweetResult> {
  const text = args.text.trim();
  if (text.length === 0) throw new Error("Tweet text is empty.");
  if (text.length > MAX_TWEET_CHARS) {
    throw new Error(`Tweet exceeds ${MAX_TWEET_CHARS} characters.`);
  }
  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      authorization: `Bearer ${args.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ text }),
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
  return { id: json.data.id, text: json.data.text ?? text };
}
