"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ProductDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Product detail error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              Error al cargar producto
            </h2>
            <p className="text-sm text-muted-foreground">
              No se pudo cargar la informaci\u00F3n del producto.
              Puede que el producto no exista o haya un problema temporal.
            </p>
          </div>

          {error.message && process.env.NODE_ENV === "development" && (
            <div className="rounded-lg bg-muted p-3 text-left">
              <p className="text-xs font-mono text-muted-foreground break-all">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Button onClick={reset} variant="default" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </Button>
            <Button variant="outline" className="gap-2" asChild>
              <Link href="/products">
                <ArrowLeft className="h-4 w-4" />
                Volver a Productos
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}