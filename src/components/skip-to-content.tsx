"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { t } from "@/lib/i18n/translations";

export function SkipToContent() {
  const { locale } = useLocale();

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-xl focus:font-medium"
    >
      {t("accessibility.skip_to_content", locale)}
    </a>
  );
}
