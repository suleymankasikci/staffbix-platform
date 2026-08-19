import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, SITE_LOCALES, localeUrl } from "@/lib/seo/site";

/**
 * /sitemap.xml — Next.js convention. Cross-joins PUBLIC_ROUTES with
 * every locale, attaching `alternates.languages` so search engines can
 * discover the per-locale variants from a single URL entry.
 *
 * Excludes auth-gated routes (`/app/*`, `/admin/*`, `/accept`, etc.)
 * and API routes by virtue of those routes NOT being in PUBLIC_ROUTES.
 *
 * `priority` / `changeFrequency` come from the route's catalog entry.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const route of PUBLIC_ROUTES) {
    for (const locale of SITE_LOCALES) {
      const languages: Record<string, string> = {};
      for (const loc of SITE_LOCALES) {
        languages[loc] = localeUrl(loc, route.path);
      }
      languages["x-default"] = localeUrl("en", route.path);

      entries.push({
        url: localeUrl(locale, route.path),
        lastModified: now,
        changeFrequency: route.changeFreq,
        priority: route.priority,
        alternates: { languages },
      });
    }
  }

  return entries;
}
