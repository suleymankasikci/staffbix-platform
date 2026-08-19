import type { Locale } from "@/lib/i18n/config";
import { HELP_TOPICS } from "./topics";
import { GENERATED_HELP_TRANSLATIONS } from "./translations.generated";
import {
  NATIVE_LOCALES,
  type HelpAudience,
  type HelpTopic,
  type LocalizedTopic,
} from "./types";

/**
 * Resolve a help topic in the caller's locale, with English fallback.
 * Returns the localized content plus an `isMachineTranslated` flag
 * the page uses to render a transparency banner.
 */
export function resolveTopic(
  slug: string,
  locale: Locale,
  audience: HelpAudience,
): { topic: HelpTopic; localized: LocalizedTopic; isFallback: boolean } | null {
  const topic = HELP_TOPICS.find(
    (t) =>
      t.slug === slug &&
      (t.audience === "both" ||
        t.audience === audience ||
        // Admin can also view user-audience topics from /admin/help.
        (audience === "admin" && t.audience === "user")),
  );
  if (!topic) return null;
  const native = topic.content[locale];
  const generated = GENERATED_HELP_TRANSLATIONS[locale]?.topics?.[topic.slug];
  const localized = native ?? generated ?? topic.content.en;
  if (!localized) return null;
  // isFallback drives the "machine-translated" banner — true for any
  // non-native locale (we either show machine content or English).
  const isFallback = !native;
  return { topic, localized, isFallback };
}

/** All topics visible to a given audience, in display order. */
export function listTopics(
  locale: Locale,
  audience: HelpAudience,
): Array<{
  topic: HelpTopic;
  localized: LocalizedTopic;
  isFallback: boolean;
}> {
  return HELP_TOPICS.filter(
    (t) =>
      t.audience === "both" ||
      t.audience === audience ||
      (audience === "admin" && t.audience === "user"),
  )
    .sort((a, b) => a.order - b.order)
    .map((topic) => {
      const native = topic.content[locale];
      const generated = GENERATED_HELP_TRANSLATIONS[locale]?.topics?.[topic.slug];
      const localized = native ?? generated ?? topic.content.en!;
      const isFallback = !native;
      return { topic, localized, isFallback };
    });
}

/** True if the caller's locale is one we author natively. */
export function isNativeLocale(locale: Locale): boolean {
  return (NATIVE_LOCALES as ReadonlyArray<Locale>).includes(locale);
}
