import Link from "next/link";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="mb-6">
          <span className="text-8xl font-bold bg-gradient-to-b from-foreground/20 to-foreground/[0.03] bg-clip-text text-transparent select-none">
            404
          </span>
        </div>

        <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Search className="h-7 w-7 text-primary" />
        </div>

        <h1 className="text-xl font-bold text-foreground mb-2">
          Página no encontrada
        </h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto">
          La página que buscas no existe o fue movida a otra ubicación.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all duration-200"
          >
            <Home className="h-4 w-4" />
            Ir al Dashboard
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </div>

        <p className="mt-10 text-[10px] text-muted-foreground/50">
          Amazon FBA Manager v2.0
        </p>
      </div>
    </div>
  );
}