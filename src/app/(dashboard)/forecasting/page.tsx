"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { toast } from "sonner";
import { TrendingUp, AlertTriangle, Package, Clock, Truck } from "lucide-react";

interface Forecast {
  product_id: string;
  sku: string;
  name: string;
  stock_available: number;
  sales_velocity_30d: number;
  daily_velocity: number;
  days_of_stock: number;
  lead_time_days: number;
  reorder_point: number;
  suggested_qty: number;
  supplier_name: string | null;
  urgency: "critical" | "warning" | "ok";
}

export default function ForecastingPage() {
  const [loading, setLoading] = useState(true);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);

  useEffect(() => {
    fetch("/api/forecasting")
      .then((r) => r.json())
      .then((data) => {
        setForecasts(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Error cargando forecast");
        setLoading(false);
      });
  }, []);

  const critical = forecasts.filter((f) => f.urgency === "critical");
  const warning = forecasts.filter((f) => f.urgency === "warning");

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge="FORECASTING"
        title="Sugerencias de Reorden"
        subtitle="Basado en velocidad de ventas de los ultimos 30 dias y lead time de proveedores"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/10 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-[10px] uppercase tracking-wider text-red-700 dark:text-red-300">Critico</span>
          </div>
          <p className="text-2xl font-display font-bold text-red-700 dark:text-red-400">{critical.length}</p>
          <p className="text-xs text-red-600/70 dark:text-red-400/70">Stock menor al lead time</p>
        </div>
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/10 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300">Advertencia</span>
          </div>
          <p className="text-2xl font-display font-bold text-amber-700 dark:text-amber-400">{warning.length}</p>
          <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Stock menor a 2x lead time</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total sugerencias</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{forecasts.length}</p>
          <p className="text-xs text-muted-foreground">Productos activos a revisar</p>
        </div>
      </div>

      <DataTableWrapper title="Sugerencias de Reorden" icon={TrendingUp}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Producto</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Stock</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Ventas/dia</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Dias stock</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Lead time</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Sugerido</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Proveedor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {forecasts.map((f) => (
                <tr key={f.product_id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{f.name}</p>
                    <p className="text-[10px] text-muted-foreground">{f.sku}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-display">{f.stock_available}</td>
                  <td className="px-4 py-3 text-right font-display text-muted-foreground">{f.daily_velocity}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-display font-bold ${f.days_of_stock <= f.lead_time_days ? "text-red-600 dark:text-red-400" : f.days_of_stock <= f.lead_time_days * 2 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-emerald-400"}`}>
                      {f.days_of_stock}d
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{f.lead_time_days}d</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold font-display">
                      {f.suggested_qty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{f.supplier_name || "—"}</td>
                </tr>
              ))}
              {forecasts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No hay productos que necesiten reorden. Todas las metricas estan saludables.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DataTableWrapper>
    </div>
  );
}
