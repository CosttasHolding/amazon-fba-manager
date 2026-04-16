import Link from "next/link";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        {/* 404 number */}
        <div className="mb-6">
          <span className="text-8xl font-bold bg-gradient-to-b from-white/20 to-white/[0.03] bg-clip-text text-transparent select-none">
            404
          </span>
        </div>

        {/* Icon */}
        <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <Search className="h-7 w-7 text-cyan-400" />
        </div>

        {/* Text */}
        <h1 className="text-xl font-bold text-white mb-2">
          Página no encontrada
        </h1>
        <p className="text-sm text-white/40 mb-8 max-w-xs mx-auto">
          La página que buscas no existe o fue movida a otra ubicación.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-all duration-200"
          >
            <Home className="h-4 w-4" />
            Ir al Dashboard
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-10 text-[10px] text-white/20">
          Amazon FBA Manager v2.0
        </p>
      </div>
    </div>
  );
}