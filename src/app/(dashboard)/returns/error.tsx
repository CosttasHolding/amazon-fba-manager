"use client";

import { ErrorFallback } from "@/components/ui/error-fallback";
import { useLocale } from "@/lib/i18n/locale-context";
import { t } from "@/lib/i18n/translations";

export default function ReturnsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale } = useLocale();
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title={t("error.module_returns", locale)}
      message={t("error.module_generic_message", locale)}
      backHref="/returns"
    />
  );
}
