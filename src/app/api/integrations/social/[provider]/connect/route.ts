import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import {
  isSocialProvider,
  makePkce,
  randomState,
  buildAuthorizeUrl,
  SocialConfigError,
} from "@/lib/integrations/social-oauth";
import { isLocale } from "@/lib/i18n/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ provider: string }>;
}

export const SOCIAL_OAUTH_COOKIE = "staffbix_social_oauth";

/**
 * GET /api/integrations/social/[provider]/connect?lang=xx
 *
 * Starts the OAuth2 (Authorization Code + PKCE for X) connect flow.
 * Generates a state + PKCE verifier, stashes them in a short-lived
 * httpOnly cookie, and redirects the operator to the provider's consent
 * screen. The callback validates state against the cookie (CSRF guard).
 *
 * If the provider's client credentials aren't configured in the
 * environment, redirects back to the integrations page with an explicit
 * error rather than starting a broken flow.
 */
export async function GET(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireApp();
  const { provider } = await ctx.params;
  const lang = req.nextUrl.searchParams.get("lang") ?? "en";
  const locale = isLocale(lang) ? lang : "en";
  const back = `/${locale}/app/integrations`;

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "GET /api/integrations/social/[provider]/connect",
  });
  if (t) return t;

  if (!isSocialProvider(provider)) {
    return NextResponse.redirect(
      new URL(`${back}?error=unknown_provider`, req.url),
    );
  }

  let authorizeUrl: string;
  const { verifier, challenge } = makePkce();
  const state = randomState();
  try {
    authorizeUrl = buildAuthorizeUrl({ provider, state, challenge });
  } catch (e) {
    if (e instanceof SocialConfigError) {
      return NextResponse.redirect(
        new URL(`${back}?error=unconfigured&provider=${provider}`, req.url),
      );
    }
    throw e;
  }

  const res = NextResponse.redirect(authorizeUrl);
  const jar = await cookies();
  jar.set(
    SOCIAL_OAUTH_COOKIE,
    JSON.stringify({ provider, state, verifier, locale }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600, // 10 minutes to complete consent
    },
  );
  return res;
}
