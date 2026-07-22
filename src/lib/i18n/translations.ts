import es from "./es.json";
import en from "./en.json";
import ar from "./ar.json";

export type Locale = "es" | "en" | "ar";

export type Direction = "ltr" | "rtl";

export function getDirection(locale: Locale): Direction {
  return locale === "ar" ? "rtl" : "ltr";
}

const translations: Record<Locale, Record<string, string>> = { es, en, ar };

export function t(key: string, locale: Locale): string {
  return translations[locale]?.[key] || translations["es"]?.[key] || key;
}

export function getLanguageName(locale: Locale): string {
  return t(`language.${locale}`, locale);
}
