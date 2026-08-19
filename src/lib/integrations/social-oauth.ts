import { createHash, randomBytes } from "node:crypto";

/**
 * OAuth2 config + token exchange for the social publishers (X / Twitter
 * and LinkedIn). All client credentials are read from the environment —
 * there are NO baked-in defaults. A missing credential throws a clear
 * error so the connect flow fails loudly instead of silently using a
 * fake value.
 *
 * Required env (see "MANUAL CONFIG" in the rollout notes):
 *   TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET
 *   LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
 *   PUBLIC_APP_URL  (used to build the OAuth redirect URI)
 */

export type SocialProvider = "twitter" | "linkedin";

export function isSocialProvider(v: string): v is SocialProvider {
  return v === "twitter" || v === "linkedin";
}

interface ProviderConfig {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string;
  usesPkce: boolean;
  /** Env var names for client id + secret. */
  idEnv: string;
  secretEnv: string;
}

const CONFIG: Record<SocialProvider, ProviderConfig> = {
  twitter: {
    authorizeUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    // tweet.write to post, users.read to resolve the author, offline.access
    // to receive a refresh_token (X access tokens expire in ~2h).
    scopes: "tweet.read tweet.write users.read offline.access",
    usesPkce: true,
    idEnv: "TWITTER_CLIENT_ID",
    secretEnv: "TWITTER_CLIENT_SECRET",
  },
  linkedin: {
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    // w_member_social to post; openid + profile to resolve the author URN.
    scopes: "openid profile w_member_social",
    usesPkce: false,
    idEnv: "LINKEDIN_CLIENT_ID",
    secretEnv: "LINKEDIN_CLIENT_SECRET",
  },
};

export class SocialConfigError extends Error {
  readonly code = "social_oauth_unconfigured";
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim().length === 0) {
    throw new SocialConfigError(
      `${name} is not configured. Set it in the environment to enable this integration.`,
    );
  }
  return v;
}

export function providerCredentials(provider: SocialProvider): {
  clientId: string;
  clientSecret: string;
} {
  const cfg = CONFIG[provider];
  return {
    clientId: requireEnv(cfg.idEnv),
    clientSecret: requireEnv(cfg.secretEnv),
  };
}

export function redirectUri(provider: SocialProvider): string {
  const base = requireEnv("PUBLIC_APP_URL").replace(/\/$/, "");
  return `${base}/api/integrations/social/${provider}/callback`;
}

/** PKCE: high-entropy verifier + its S256 challenge. */
export function makePkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function randomState(): string {
  return randomBytes(24).toString("base64url");
}

export function buildAuthorizeUrl(args: {
  provider: SocialProvider;
  state: string;
  challenge: string;
}): string {
  const cfg = CONFIG[args.provider];
  const { clientId } = providerCredentials(args.provider);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri(args.provider),
    scope: cfg.scopes,
    state: args.state,
  });
  if (cfg.usesPkce) {
    params.set("code_challenge", args.challenge);
    params.set("code_challenge_method", "S256");
  }
  return `${cfg.authorizeUrl}?${params.toString()}`;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresInSec: number | null;
  scope: string;
  raw: Record<string, unknown>;
}

function parseTokenJson(json: Record<string, unknown>): TokenResponse {
  const accessToken = typeof json.access_token === "string" ? json.access_token : "";
  if (!accessToken) {
    throw new Error("Token response missing access_token.");
  }
  return {
    accessToken,
    refreshToken:
      typeof json.refresh_token === "string" ? json.refresh_token : null,
    expiresInSec:
      typeof json.expires_in === "number" ? json.expires_in : null,
    scope: typeof json.scope === "string" ? json.scope : "",
    raw: json,
  };
}

/** Exchange an authorization code for tokens. */
export async function exchangeCode(args: {
  provider: SocialProvider;
  code: string;
  verifier: string;
}): Promise<TokenResponse> {
  const cfg = CONFIG[args.provider];
  const { clientId, clientSecret } = providerCredentials(args.provider);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: args.code,
    redirect_uri: redirectUri(args.provider),
    client_id: clientId,
  });
  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
  };
  if (cfg.usesPkce) body.set("code_verifier", args.verifier);
  if (args.provider === "twitter") {
    // X confidential client: HTTP Basic auth with client_id:client_secret.
    headers.authorization =
      "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  } else {
    body.set("client_secret", clientSecret);
  }

  const res = await fetch(cfg.tokenUrl, { method: "POST", headers, body });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      `${args.provider} token exchange failed: ${res.status} ${JSON.stringify(json).slice(0, 200)}`,
    );
  }
  return parseTokenJson(json);
}

/** Refresh an X (Twitter) access token using its refresh_token. */
export async function refreshTwitterToken(
  refreshToken: string,
): Promise<TokenResponse> {
  const cfg = CONFIG.twitter;
  const { clientId, clientSecret } = providerCredentials("twitter");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });
  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization:
        "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      `twitter token refresh failed: ${res.status} ${JSON.stringify(json).slice(0, 200)}`,
    );
  }
  return parseTokenJson(json);
}
