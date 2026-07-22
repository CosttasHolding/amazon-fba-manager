"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background animate-fade-in">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2">
          Error de aplicación
        </h2>
        <p className="text-sm text-muted-foreground mb-2">
          Ocurrió un error crítico en la aplicación.
        </p>

        {error.message && (
          <div className="rounded-xl border border-border bg-muted/50 p-3 mb-6">
            <p className="text-xs text-muted-foreground font-mono break-all">
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
            Reintentar
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-200"
          >
            <Home className="h-4 w-4" />
            Ir al inicio
          </Link>
        </div>

        {error.digest && (
          <p className="text-[10px] text-muted-foreground/50 mt-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}