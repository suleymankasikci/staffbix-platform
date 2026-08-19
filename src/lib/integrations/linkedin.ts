/**
 * LinkedIn publisher + identity lookup. Real HTTP calls — no stub. The
 * access token comes from the tenant's stored OAuth integration (see
 * social-oauth.ts). Posting uses the UGC Posts API with the member URN
 * resolved from the OpenID Connect userinfo endpoint.
 */

export interface LinkedInPostResult {
  id: string;
}

/**
 * Resolve the member's URN + display name from the OIDC userinfo
 * endpoint (works with the `openid profile` scopes). The `sub` claim is
 * the member id; the author URN is `urn:li:person:{sub}`.
 */
export async function getLinkedInMe(accessToken: string): Promise<{
  authorUrn: string;
  name: string;
}> {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json().catch(() => ({}))) as {
    sub?: string;
    name?: string;
  };
  if (!res.ok || !json.sub) {
    throw new Error(
      `linkedin userinfo failed: ${res.status} ${JSON.stringify(json).slice(0, 200)}`,
    );
  }
  return { authorUrn: `urn:li:person:${json.sub}`, name: json.name ?? "" };
}

const MAX_POST_CHARS = 3000;

/** Publish a text share on behalf of the member. Returns the post URN. */
export async function postLinkedInShare(args: {
  accessToken: string;
  authorUrn: string;
  text: string;
}): Promise<LinkedInPostResult> {
  const text = args.text.trim();
  if (text.length === 0) throw new Error("LinkedIn post text is empty.");
  if (text.length > MAX_POST_CHARS) {
    throw new Error(`LinkedIn post exceeds ${MAX_POST_CHARS} characters.`);
  }

  const body = {
    author: args.authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      authorization: `Bearer ${args.accessToken}`,
      "content-type": "application/json",
      "x-restli-protocol-version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `linkedin ugcPosts failed: ${res.status} ${errText.slice(0, 200)}`,
    );
  }
  // The created post URN comes back in the x-restli-id header (or body id).
  const id =
    res.headers.get("x-restli-id") ??
    res.headers.get("x-linkedin-id") ??
    "";
  return { id };
}
