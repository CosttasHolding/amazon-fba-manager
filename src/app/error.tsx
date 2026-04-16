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
    <div className="flex items-center justify-center min-h-screen bg-[#030712] animate-fade-in">
      <div className="text-center max-w-md mx-auto px-4">
        {/* Icon */}
        <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>

        {/* Text */}
        <h2 className="text-xl font-bold text-white mb-2">
          Error de aplicación
        </h2>
        <p className="text-sm text-white/40 mb-2">
          Ocurrió un error crítico en la aplicación.
        </p>

        {/* Error detail */}
        {error.message && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 mb-6">
            <p className="text-xs text-white/30 font-mono break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-all duration-200"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all duration-200"
          >
            <Home className="h-4 w-4" />
            Ir al inicio
          </Link>
        </div>

        {/* Digest */}
        {error.digest && (
          <p className="text-[10px] text-white/20 mt-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}