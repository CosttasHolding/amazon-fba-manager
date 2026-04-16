"use client";

import { useEffect, useState } from "react";
import { fmt, fmtPct } from "@/lib/utils";
import { DashboardMetrics } from "@/types";
import { Package, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTableWrapper, tableHeaderClass, tableRowClass, tableCellClass } from "@/components/ui/data-table-wrapper";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setMetrics(d.metrics);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  const alertCount =
    (metrics?.low_stock_count || 0) + (metrics?.out_of_stock_count || 0);

  return (
    <div>
      <PageHeader
        badge="GLOBAL DASHBOARD"
        title="Resumen del Negocio"
        subtitle="Vista general de tu operación Amazon FBA"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Productos Activos"
          value={String(metrics?.active_products || 0)}
          subtitle={`de ${metrics?.total_products || 0} total`}
          icon={Package}
          accentColor="cyan"
          animationDelay={0}
          progressBar={
            metrics?.total_products
              ? Math.round(
                  ((metrics?.active_products || 0) / metrics.total_products) * 100
                )
              : 0
          }
        />
        <KpiCard
          label="Promedio ROI"
          value={fmtPct(metrics?.avg_roi)}
          subtitle="retorno de inversión"
          icon={TrendingUp}
          accentColor="green"
          trend={
            (metrics?.avg_roi || 0) >= 20
              ? "up"
              : (metrics?.avg_roi || 0) > 0
                ? "neutral"
                : "down"
          }
          trendValue={
            (metrics?.avg_roi || 0) >= 20 ? "Saludable" : "Revisar"
          }
          animationDelay={75}
        />
        <KpiCard
          label="Beneficio Potencial"
          value={fmt(metrics?.total_potential_profit)}
          subtitle="por unidad vendida"
          icon={DollarSign}
          accentColor="green"
          animationDelay={150}
        />
        <KpiCard
          label="Alertas Stock"
          value={String(alertCount)}
          subtitle={`${metrics?.low_stock_count || 0} bajo, ${metrics?.out_of_stock_count || 0} sin stock`}
          icon={AlertTriangle}
          accentColor="amber"
          animationDelay={225}
          trend={alertCount > 0 ? "down" : "up"}
          trendValue={alertCount > 0 ? `${alertCount} alertas` : "Sin alertas"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <DataTableWrapper title="Rendimiento de Ventas">
          <div className="p-6 flex items-center justify-center h-48 text-muted-foreground text-sm">
            <div className="text-center">
              <p className="font-display text-lg font-semibold text-foreground mb-1">
                {fmt(metrics?.revenue_last_30d)}
              </p>
              <p className="text-xs text-muted-foreground">
                Revenue últimos 30 días
              </p>
              <p className="font-display text-lg font-semibold text-foreground mt-3 mb-1">
                {metrics?.units_sold_last_30d || 0} uds
              </p>
              <p className="text-xs text-muted-foreground">
                Unidades vendidas
              </p>
            </div>
          </div>
        </DataTableWrapper>

        <DataTableWrapper title="Resumen de Inventario">
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Stock Bajo</span>
                <span className="font-display font-semibold text-amber-400">
                  {metrics?.low_stock_count || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Sin Stock</span>
                <span className="font-display font-semibold text-rose-400">
                  {metrics?.out_of_stock_count || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Sobrestock</span>
                <span className="font-display font-semibold text-cyan-400">
                  {metrics?.overstock_count || 0}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-border">
                <span className="text-sm font-medium text-foreground">Total Productos</span>
                <span className="font-display font-bold text-foreground">
                  {metrics?.total_products || 0}
                </span>
              </div>
            </div>
          </div>
        </DataTableWrapper>
      </div>
    </div>
  );
}