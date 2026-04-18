"use client";

import { useEffect, useState } from "react";
import { fmt, fmtPct } from "@/lib/utils";
import { DashboardMetrics } from "@/types";
import {
  Package,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";

interface TopProduct {
  id: string;
  name: string;
  sku: string;
  sale_price: number;
  net_profit: number;
  roi: number;
  status: string;
  stock_available: number;
  sales_velocity_30d: number;
}

interface StockAlert {
  id: string;
  type: string;
  product_name: string;
  sku: string;
  current_stock: number;
  threshold: number;
}

interface DashboardData {
  metrics: DashboardMetrics;
  topProducts: TopProduct[];
  alerts: StockAlert[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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

  if (!data?.metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-1">
            No se pudieron cargar los datos
          </p>
          <p className="text-sm text-muted-foreground">
            Verificá tu conexión e intentá de nuevo
          </p>
        </div>
      </div>
    );
  }

  const { metrics, topProducts, alerts } = data;

  const alertCount =
    (metrics?.low_stock_count || 0) + (metrics?.out_of_stock_count || 0);

  return (
    <div>
      <PageHeader
        badge="GLOBAL DASHBOARD"
        title="Resumen del Negocio"
        subtitle="Vista general de tu operación en Amazon FBA"
      />

      {/* KPI Cards */}
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
                  ((metrics?.active_products || 0) / metrics.total_products) *
                    100
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

      {/* Sales Performance + Inventory Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <DataTableWrapper title="Rendimiento de Ventas" icon={BarChart3}>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <p className="font-display text-2xl font-bold text-foreground">
                  {fmt(metrics?.revenue_last_30d)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Revenue últimos 30 días
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <p className="font-display text-2xl font-bold text-foreground">
                  {metrics?.units_sold_last_30d || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Unidades vendidas
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <p className="font-display text-2xl font-bold text-foreground">
                  {fmt(metrics?.avg_profit)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Beneficio promedio/producto
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <p className="font-display text-2xl font-bold text-foreground">
                  {fmtPct(metrics?.avg_margin)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Margen promedio
                </p>
              </div>
            </div>
            {(metrics?.total_inventory_value ?? 0) > 0 && (
              <div className="mt-4 p-4 rounded-xl border border-border bg-card">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Valor total del inventario
                  </span>
                  <span className="font-display font-bold text-foreground">
                    {fmt(metrics?.total_inventory_value)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </DataTableWrapper>

        <DataTableWrapper title="Resumen de Inventario" icon={Boxes}>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Stock Normal
                </span>
                <span className="font-display font-semibold text-emerald-500">
                  {(metrics?.total_products || 0) -
                    (metrics?.low_stock_count || 0) -
                    (metrics?.out_of_stock_count || 0) -
                    (metrics?.overstock_count || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Stock Bajo
                </span>
                <span className="font-display font-semibold text-amber-500">
                  {metrics?.low_stock_count || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Sin Stock
                </span>
                <span className="font-display font-semibold text-destructive">
                  {metrics?.out_of_stock_count || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Sobrestock
                </span>
                <span className="font-display font-semibold text-blue-500">
                  {metrics?.overstock_count || 0}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-border">
                <span className="text-sm font-medium text-foreground">
                  Total Productos
                </span>
                <span className="font-display font-bold text-foreground">
                  {metrics?.total_products || 0}
                </span>
              </div>
            </div>

            {/* Visual bar */}
            {(metrics?.total_products || 0) > 0 && (
              <div className="mt-5">
                <div className="flex h-3 rounded-full overflow-hidden bg-muted/50">
                  <div
                    className="bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${(((metrics?.total_products || 0) - (metrics?.low_stock_count || 0) - (metrics?.out_of_stock_count || 0) - (metrics?.overstock_count || 0)) / (metrics?.total_products || 1)) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-amber-500 transition-all duration-500"
                    style={{
                      width: `${((metrics?.low_stock_count || 0) / (metrics?.total_products || 1)) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-red-500 transition-all duration-500"
                    style={{
                      width: `${((metrics?.out_of_stock_count || 0) / (metrics?.total_products || 1)) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-blue-500 transition-all duration-500"
                    style={{
                      width: `${((metrics?.overstock_count || 0) / (metrics?.total_products || 1)) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex gap-4 mt-2 flex-wrap">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Normal
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Bajo
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Sin Stock
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Sobrestock
                  </span>
                </div>
              </div>
            )}
          </div>
        </DataTableWrapper>
      </div>

      {/* Top Products Table */}
      {topProducts && topProducts.length > 0 && (
        <div className="mb-8">
          <DataTableWrapper title="Top 10 Productos por Beneficio" icon={TrendingUp}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">
                      #
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">
                      Producto
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-4">
                      Precio Venta
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-4">
                      Beneficio
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-4">
                      ROI
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-4 hidden sm:table-cell">
                      Stock
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-4 hidden md:table-cell">
                      Vel. Ventas
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground p-4 hidden lg:table-cell">
                      Estado
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground p-4">
                      Ver
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product, index) => (
                    <tr
                      key={product.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4 text-sm text-muted-foreground font-mono">
                        {index + 1}
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                            {product.name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {product.sku}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-display font-semibold text-foreground">
                          {fmt(product.sale_price)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={`text-sm font-display font-semibold ${
                            (product.net_profit || 0) >= 0
                              ? "text-emerald-500"
                              : "text-red-500"
                          }`}
                        >
                          {fmt(product.net_profit)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(product.roi || 0) >= 20 ? (
                            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                          ) : (product.roi || 0) > 0 ? (
                            <Minus className="w-3 h-3 text-amber-500" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 text-red-500" />
                          )}
                          <span
                            className={`text-sm font-display font-semibold ${
                              (product.roi || 0) >= 20
                                ? "text-emerald-500"
                                : (product.roi || 0) > 0
                                  ? "text-amber-500"
                                  : "text-red-500"
                            }`}
                          >
                            {fmtPct(product.roi)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right hidden sm:table-cell">
                        <span className="text-sm text-foreground">
                          {product.stock_available ?? 0}
                        </span>
                      </td>
                      <td className="p-4 text-right hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {product.sales_velocity_30d ?? 0} uds/mes
                        </span>
                      </td>
                      <td className="p-4 text-center hidden lg:table-cell">
                        <StatusBadge status={product.status as any} />
                      </td>
                      <td className="p-4 text-center">
                        <Link
                          href={`/products/${product.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataTableWrapper>
        </div>
      )}

      {/* Stock Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="mb-8">
          <DataTableWrapper title="Alertas de Stock" icon={AlertTriangle}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">
                      Producto
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground p-4">
                      Tipo
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-4">
                      Stock Actual
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-4 hidden sm:table-cell">
                      Punto Reorden
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground p-4">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr
                      key={alert.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4">
                        <div>
                          <p className="text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                            {alert.product_name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {alert.sku}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {alert.type === "out_of_stock" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                            Sin Stock
                          </span>
                        )}
                        {alert.type === "low_stock" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500">
                            Stock Bajo
                          </span>
                        )}
                        {alert.type === "overstock" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500">
                            Sobrestock
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={`text-sm font-display font-semibold ${
                            alert.current_stock === 0
                              ? "text-destructive"
                              : "text-foreground"
                          }`}
                        >
                          {alert.current_stock ?? 0}
                        </span>
                      </td>
                      <td className="p-4 text-right hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {alert.threshold ?? "—"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Link
                          href={`/products/${alert.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataTableWrapper>
        </div>
      )}

      {/* Empty state when no products */}
      {(metrics?.total_products || 0) === 0 && (
        <DataTableWrapper title="Comenzá a usar el Dashboard">
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">
              No hay productos todavía
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Agregá tu primer producto para ver métricas reales aquí
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm"
            >
              <Package className="w-4 h-4" />
              Ir a Productos
            </Link>
          </div>
        </DataTableWrapper>
      )}
    </div>
  );
}