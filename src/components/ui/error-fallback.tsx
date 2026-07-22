"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/locale-context";
import { t } from "@/lib/i18n/translations";

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  message?: string;
  backHref?: string;
}

export function ErrorFallback({
  error,
  reset,
  title,
  message,
  backHref = "/dashboard",
}: ErrorFallbackProps) {
  const { locale } = useLocale();

  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2">
          {title || t("error.something_went_wrong", locale)}
        </h2>
        <p className="text-sm text-muted-foreground mb-2">
          {message || t("error.unexpected_error", locale)}
        </p>

        {error.message && (
          <div className="rounded-xl border border-border bg-muted p-3 mb-6">
            <p className="text-xs text-muted-foreground/70 font-mono break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all duration-200"
          >
            <RefreshCw className="h-4 w-4" />
            {t("error.retry", locale)}
          </button>

          <Link
            href={backHref}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-200"
          >
            <Home className="h-4 w-4" />
            {t("error.go_home", locale)}
          </Link>
        </div>

        {error.digest && (
          <p className="text-[10px] text-muted-foreground/70 mt-6 font-mono">
            {t("error.id", locale).replace("{digest}", error.digest)}
          </p>
        )}
      </div>
    </div>
  );
}
