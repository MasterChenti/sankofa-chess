/**
 * Language architecture. Content tables (stories, thoughts) carry a `locale`, so translations
 * are added as new rows — no code changes. English ships first; these are planned next.
 */
export const SUPPORTED_LOCALES = ["en"] as const;
export const PLANNED_LOCALES = ["tw", "gaa", "ee", "ha", "yo", "sw", "fr", "pt", "ar"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function contentLocale(profile: { locale?: string | null } | null | undefined): Locale {
  const l = profile?.locale;
  return (SUPPORTED_LOCALES as readonly string[]).includes(l ?? "") ? (l as Locale) : "en";
}
