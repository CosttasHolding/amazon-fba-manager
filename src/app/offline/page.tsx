import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = {
  title: "Sin conexión",
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-muted border border-border flex items-center justify-center">
          <WifiOff className="w-7 h-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">
          Sin conexión
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          No hay conexión a internet. Revisá tu conexión e intentá de nuevo.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Reintentar
        </Link>
      </div>
    </div>
  );
}
