import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireApp } from "@/lib/auth/guards";
import {
  isSocialProvider,
  exchangeCode,
  type SocialProvider,
} from "@/lib/integrations/social-oauth";
import { createIntegration } from "@/lib/integrations/manage";
import { getTwitterMe } from "@/lib/integrations/twitter";
import { getLinkedInMe } from "@/lib/integrations/linkedin";
import { logSecurityEvent } from "@/lib/audit/log";
import { SOCIAL_OAUTH_COOKIE } from "../connect/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ provider: string }>;
}

function expiresAtIso(expiresInSec: number | null): string | null {
  if (!expiresInSec) return null;
  return new Date(Date.now() + expiresInSec * 1000).toISOString();
}

/**
 * GET /api/integrations/social/[provider]/callback
 *
 * OAuth redirect target. Validates state against the connect cookie,
 * exchanges the code for tokens, resolves the posting identity, and
 * stores an encrypted `integrations` row (kind = twitter | linkedin).
 * Then redirects back to the operator's integrations page with a
 * success / error flag.
 */
export async function GET(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireApp();
  const { provider } = await ctx.params;
  const url = req.nextUrl;

  const jar = await cookies();
  const cookieRaw = jar.get(SOCIAL_OAUTH_COOKIE)?.value;
  // Default redirect target; refined once we read the cookie's locale.
  let locale = "en";

  const fail = (reason: string) =>
    NextResponse.redirect(
      new URL(`/${locale}/app/integrations?error=${reason}`, req.url),
    );

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (!isSocialProvider(provider)) return fail("unknown_provider");

  // Clear the cookie regardless of outcome.
  jar.delete(SOCIAL_OAUTH_COOKIE);

  if (!cookieRaw) return fail("expired_state");
  let parsed: { provider?: string; state?: string; verifier?: string; locale?: string };
  try {
    parsed = JSON.parse(cookieRaw) as typeof parsed;
  } catch {
    return fail("bad_state");
  }
  if (typeof parsed.locale === "string") locale = parsed.locale;

  // Provider mismatch or OAuth error from the provider.
  const oauthError = url.searchParams.get("error");
  if (oauthError) return fail(`provider_${oauthError}`.slice(0, 40));
  if (parsed.provider !== provider) return fail("provider_mismatch");

  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  if (!code) return fail("missing_code");
  if (!state || state !== parsed.state) return fail("state_mismatch");
  if (!parsed.verifier) return fail("missing_verifier");

  try {
    const token = await exchangeCode({
      provider: provider as SocialProvider,
      code,
      verifier: parsed.verifier,
    });

    if (provider === "twitter") {
      const me = await getTwitterMe(token.accessToken);
      await createIntegration({
        tenantId: session.tenantId,
        kind: "twitter",
        displayName: me.username ? `X · @${me.username}` : "X (Twitter)",
        externalId: me.id,
        secret: {
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt: expiresAtIso(token.expiresInSec),
          scope: token.scope,
          userId: me.id,
          username: me.username,
          verifiedType: me.verifiedType,
        },
        metadata: { username: me.username },
      });
    } else {
      const me = await getLinkedInMe(token.accessToken);
      await createIntegration({
        tenantId: session.tenantId,
        kind: "linkedin",
        displayName: me.name ? `LinkedIn · ${me.name}` : "LinkedIn",
        externalId: me.authorUrn,
        secret: {
          accessToken: token.accessToken,
          expiresAt: expiresAtIso(token.expiresInSec),
          authorUrn: me.authorUrn,
          name: me.name,
        },
        metadata: { name: me.name },
      });
    }

    await logSecurityEvent({
      kind: "social.account.connected",
      tenantId: session.tenantId,
      userId: session.user.id,
      payload: {
        subject: "social.account.connected",
        provider,
        actorUserId: session.user.id,
      },
    });

    return NextResponse.redirect(
      new URL(`/${locale}/app/integrations?connected=${provider}`, req.url),
    );
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error(`[social-oauth] ${provider} callback failed:`, reason);
    return fail("exchange_failed");
  }
}
