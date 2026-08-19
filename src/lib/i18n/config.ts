export const LOCALES = [
  "en",
  "tr",
  "de",
  "fr",
  "it",
  "es",
  "pt",
  "zh",
  "ko",
  "ja",
  "ru",
  "ar",
  "uk",
  "th",
  "hi",
  "no",
  "fi",
  "ms",
  "pl",
  "sv",
  "he",
  "da",
  "nl",
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const RTL_LOCALES = new Set<Locale>(["ar", "he"]);

export const LOCALE_COOKIE = "staffbix-locale";

export const LANGUAGES: {
  code: string;
  locale: Locale;
  shortCode: string;
  label: string;
  flag: string;
}[] = [
  { code: "EN", locale: "en", shortCode: "EN", label: "English", flag: "🇺🇸" },
  { code: "TR", locale: "tr", shortCode: "TR", label: "Türkçe", flag: "🇹🇷" },
  { code: "DE", locale: "de", shortCode: "DE", label: "Deutsch", flag: "🇩🇪" },
  { code: "FR", locale: "fr", shortCode: "FR", label: "Français", flag: "🇫🇷" },
  { code: "IT", locale: "it", shortCode: "IT", label: "Italiano", flag: "🇮🇹" },
  { code: "ES", locale: "es", shortCode: "ES", label: "Español", flag: "🇪🇸" },
  { code: "PT", locale: "pt", shortCode: "PT", label: "Português", flag: "🇵🇹" },
  { code: "ZH", locale: "zh", shortCode: "ZH", label: "中文 (简体)", flag: "🇨🇳" },
  { code: "KO", locale: "ko", shortCode: "KO", label: "한국어", flag: "🇰🇷" },
  { code: "JA", locale: "ja", shortCode: "JA", label: "日本語", flag: "🇯🇵" },
  { code: "RU", locale: "ru", shortCode: "RU", label: "Русский", flag: "🇷🇺" },
  { code: "AR", locale: "ar", shortCode: "AR", label: "العربية", flag: "🇸🇦" },
  { code: "UK", locale: "uk", shortCode: "UK", label: "Українська", flag: "🇺🇦" },
  { code: "TH", locale: "th", shortCode: "TH", label: "ไทย", flag: "🇹🇭" },
  { code: "HI", locale: "hi", shortCode: "HI", label: "हिन्दी", flag: "🇮🇳" },
  { code: "NO", locale: "no", shortCode: "NO", label: "Norsk", flag: "🇳🇴" },
  { code: "FI", locale: "fi", shortCode: "FI", label: "Suomi", flag: "🇫🇮" },
  { code: "MS", locale: "ms", shortCode: "MS", label: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "PL", locale: "pl", shortCode: "PL", label: "Polski", flag: "🇵🇱" },
  { code: "SV", locale: "sv", shortCode: "SV", label: "Svenska", flag: "🇸🇪" },
  { code: "HE", locale: "he", shortCode: "HE", label: "עברית", flag: "🇮🇱" },
  { code: "DA", locale: "da", shortCode: "DA", label: "Dansk", flag: "🇩🇰" },
  { code: "NL", locale: "nl", shortCode: "NL", label: "Vlaams", flag: "🇧🇪" },
];

export function isLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function normalizeLocale(value: string | undefined | null): Locale | null {
  if (!value) return null;
  const language = value.toLowerCase().split("-")[0];
  return isLocale(language) ? language : null;
}
