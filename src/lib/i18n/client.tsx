"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./config";
import { localizePath } from "./routing";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useLocalizedPath() {
  const locale = useLocale();
  return (href: string) => localizePath(href, locale);
}

/**
 * Persist the chosen locale.
 *
 * Always writes the cookie immediately (so the next request to the
 * server picks it up — even for anonymous visitors). If the user is
 * signed in, also fires a fire-and-forget PATCH to /api/me/locale so
 * the column on `users` reflects the choice across devices.
 *
 * The DB update is best-effort: a network error (or no session) does
 * not block the navigation, but the cookie still gets set.
 */
export function rememberLocalePreference(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  // Best-effort DB write — ignore failures (anonymous user, network blip, etc.).
  void fetch("/api/me/locale", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ locale }),
    keepalive: true,
  }).catch(() => undefined);
}
