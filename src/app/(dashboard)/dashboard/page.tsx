"use client";

import { fmt, fmtPct } from "@/lib/utils";
import { DashboardMetrics, DashboardResponse, TopProduct, StockAlert, ChartData } from "@/types";
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
  PieChart as PieChartIcon,
  Activity,
  ShoppingCart,
  Percent,
  TrendingDown,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { StatusBadge } from "@/components/ui/status-badge";
import dynamic from "next/dynamic";
import { PageSkeleton, ChartSkeleton } from "@/components/ui/page-skeleton";

const SalesChart = dynamic(() => import("@/components/charts/sales-chart").then((m) => m.SalesChart), {
  loading: () => <ChartSkeleton />,
});
const CategoryChart = dynamic(() => import("@/components/charts/category-chart").then((m) => m.CategoryChart), {
  loading: () => <ChartSkeleton />,
});
const ProfitBarChart = dynamic(() => import("@/components/charts/profit-bar-chart").then((m) => m.ProfitBarChart), {
  loading: () => <ChartSkeleton />,
});
import { ExportButton } from "@/components/ui/export-button";
import { exportToExcelPro } from "@/lib/export";
import { useDashboard } from "@/hooks/use-data";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { OnboardingChecklist } from "@/components/onboarding-checklist";

function RoiBadge({ roi }: { roi: number }) {
  if (roi >= 50) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-green-600 dark:text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Excelente
      </span>
    );
  }
  if (roi >= 20) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        OK
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-red-600 dark:text-rose-400 border border-rose-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
      Revisar
    </span>
  );
}

function DeltaIndicator({ value, suffix = "" }: { value: number; suffix?: string }) {
  const isPositive = value >= 0;
  const isNeutral = value === 0;
  return (
    <div className={cn("flex items-center gap-1 text-xs font-medium font-display", 
      isNeutral ? "text-muted-foreground" : isPositive ? "text-green-600 dark:text-emerald-400" : "text-red-600 dark:text-rose-400"
    )}>
      {isNeutral ? (
        <Minus className="w-3 h-3" />
      ) : isPositive ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      <span>{isNeutral ? "0" : `${isPositive ? "+" : ""}${value.toFixed(1)}${suffix}`}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();

  if (isLoading) {
    return <PageSkeleton kpiCount={6} rowCount={6} showCharts showSearch={false} />;
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

  const metrics: DashboardMetrics = data.metrics;
  const topProducts: TopProduct[] = data.topProducts || [];
  const alerts: StockAlert[] = data.alerts || [];
  const charts: ChartData = data.charts || { 
    salesChartData: [], 
    salesChartDataWeekly: [],
    categoryChartData: [], 
    profitChartData: [] 
  };

  const alertCount =
    (metrics?.low_stock_count || 0) + (metrics?.out_of_stock_count || 0);

  const handleExport = () => {
    const exportData = [
      {
        metric: "Revenue Mes Actual",
        value: fmt(metrics?.revenue_current_month || 0),
        detail: `vs ${fmt(metrics?.revenue_last_month || 0)} mes ant.`,
      },
      {
        metric: "Unidades Vendidas (mes)",
        value: String(metrics?.units_current_month || 0),
        detail: "",
      },
      {
        metric: "ROI Ponderado",
        value: fmtPct(metrics?.weighted_avg_roi),
        detail: "por revenue",
      },
      {
        metric: "Margen Neto Promedio",
        value: fmtPct(metrics?.margin_net_avg),
        detail: "",
      },
      {
        metric: "Valor Inventario",
        value: fmt(metrics?.total_inventory_value || 0),
        detail: "",
      },
      {
        metric: "Alertas Stock",
        value: String(alertCount),
        detail: `${metrics?.low_stock_count || 0} bajo, ${metrics?.out_of_stock_count || 0} cr\u00EDtico`,
      },
    ];
    exportToExcelPro(exportData, "dashboard-resumen");
  };

  return (
    <div>
      <PageHeader
        badge="GLOBAL DASHBOARD"
        title="Resumen del Negocio"
        subtitle="Vista general de tu operación en Amazon FBA"
      >
        <ExportButton onClick={handleExport} />
      </PageHeader>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {/* Revenue mensual */}
        <KpiCard
          label="Revenue Mensual"
          value={fmt(metrics?.revenue_current_month || 0)}
          subtitle="vs mes anterior"
          icon={DollarSign}
          accentColor="green"
          animationDelay={0}
          customTrend={
            <DeltaIndicator 
              value={metrics?.revenue_delta_pct || 0} 
              suffix="%" 
            />
          }
        />
        {/* ROI ponderado */}
        <KpiCard
          label="ROI Ponderado"
          value={fmtPct(metrics?.weighted_avg_roi)}
          subtitle="por revenue vendido"
          icon={TrendingUp}
          accentColor="cyan"
          animationDelay={75}
          trend={
            (metrics?.weighted_avg_roi || 0) >= 30
              ? "up"
              : (metrics?.weighted_avg_roi || 0) > 0
                ? "neutral"
                : "down"
          }
          trendValue={
            (metrics?.weighted_avg_roi || 0) >= 30 ? "Excelente" : 
            (metrics?.weighted_avg_roi || 0) >= 20 ? "Saludable" : "Revisar"
          }
        />
        {/* Unidades vendidas */}
        <KpiCard
          label="Unidades (mes)"
          value={String(metrics?.units_current_month || 0)}
          subtitle="vs mes anterior"
          icon={ShoppingCart}
          accentColor="cyan"
          animationDelay={150}
          customTrend={
            <DeltaIndicator 
              value={metrics?.units_delta_pct || 0} 
              suffix="%" 
            />
          }
        />
        {/* Margen neto */}
        <KpiCard
          label="Margen Neto"
          value={fmtPct(metrics?.margin_net_avg)}
          subtitle="promedio ponderado"
          icon={Percent}
          accentColor="green"
          animationDelay={225}
          trend={
            (metrics?.margin_net_avg || 0) >= 25
              ? "up"
              : (metrics?.margin_net_avg || 0) > 0
                ? "neutral"
                : "down"
          }
          trendValue={
            (metrics?.margin_net_avg || 0) >= 25 ? "Alto" : 
            (metrics?.margin_net_avg || 0) >= 15 ? "Saludable" : "Revisar"
          }
        />
        {/* Alertas */}
        <KpiCard
          label="Alertas Stock"
          value={String(alertCount)}
          subtitle={`${metrics?.low_stock_count || 0} bajo, ${metrics?.out_of_stock_count || 0} cr\u00EDtico`}
          icon={AlertTriangle}
          accentColor="amber"
          animationDelay={300}
          trend={alertCount > 0 ? "down" : "up"}
          trendValue={alertCount > 0 ? `${alertCount} alertas` : "Sin alertas"}
        />
        {/* Valor inventario */}
        <KpiCard
          label="Valor Inventario"
          value={fmt(metrics?.total_inventory_value || 0)}
          subtitle="costo total en USD"
          icon={Boxes}
          accentColor="purple"
          animationDelay={375}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-2">
          <DataTableWrapper title="Tendencia de Ventas" icon={Activity}>
            <div className="p-4">
              <SalesChart 
                dataDaily={charts?.salesChartData || []} 
                dataWeekly={charts?.salesChartDataWeekly || []}
              />
            </div>
          </DataTableWrapper>
        </div>
        <div>
          <DataTableWrapper title="Distribución por Categoría" icon={PieChartIcon}>
            <div className="p-4">
              <CategoryChart data={charts?.categoryChartData || []} />
            </div>
          </DataTableWrapper>
        </div>
      </div>

      {/* Profit Bar Chart */}
      {charts?.profitChartData && charts.profitChartData.length > 0 && (
        <div className="mb-8">
          <DataTableWrapper title="Top 10 Productos por Beneficio" icon={BarChart3}>
            <div className="p-4">
              <ProfitBarChart data={charts.profitChartData} />
            </div>
          </DataTableWrapper>
        </div>
      )}

      {/* Top 5 Productos + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Top 5 Productos */}
        <DataTableWrapper title="Top 5 por Rentabilidad" icon={TrendingUp}>
          <div className="overflow-x-auto">
            {topProducts.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No hay productos activos todavía
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">#</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Producto</th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-4">Unidades</th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-4">Revenue</th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-4 hidden sm:table-cell">ROI</th>
                    <th className="text-center text-xs font-medium text-muted-foreground p-4 hidden md:table-cell">Estado</th>
                    <th className="text-center text-xs font-medium text-muted-foreground p-4">Ver</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product, index) => (
                    <tr
                      key={product.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4 text-sm text-muted-foreground font-mono">{index + 1}</td>
                      <td className="p-4">
                        <div>
                          <p className="text-sm font-medium text-foreground truncate max-w-[180px] sm:max-w-[240px]">
                            {product.name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-display text-foreground">
                          {product.sales_velocity_30d ?? 0}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-display font-semibold text-foreground">
                          {fmt((product.sale_price || 0) * (product.sales_velocity_30d || 0))}
                        </span>
                      </td>
                      <td className="p-4 text-right hidden sm:table-cell">
                        <div className="flex items-center justify-end gap-1">
                          {(product.roi || 0) >= 20 ? (
                            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                          ) : (product.roi || 0) > 0 ? (
                            <Minus className="w-3 h-3 text-amber-500" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 text-rose-500" />
                          )}
                          <span className={`text-sm font-display font-semibold ${(product.roi || 0) >= 20 ? "text-emerald-500" : (product.roi || 0) > 0 ? "text-amber-500" : "text-rose-500"}`}>
                            {fmtPct(product.roi)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center hidden md:table-cell">
                        <RoiBadge roi={product.roi || 0} />
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
            )}
          </div>
        </DataTableWrapper>

        {/* Alertas de Stock */}
        <DataTableWrapper title="Alertas de Inventario" icon={AlertTriangle}>
          <div className="overflow-x-auto">
            {alerts.length === 0 ? (
              <div className="p-8 text-center">
                <Boxes className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Todo el stock está en niveles normales
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Producto</th>
                    <th className="text-center text-xs font-medium text-muted-foreground p-4">Tipo</th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-4">Stock</th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-4 hidden sm:table-cell">Reorden</th>
                    <th className="text-center text-xs font-medium text-muted-foreground p-4">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="text-sm font-medium text-foreground truncate max-w-[180px] sm:max-w-[240px]">{alert.product_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{alert.sku}</p>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {alert.type === "out_of_stock" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-red-600 dark:text-rose-400 border border-rose-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                            Sin Stock
                          </span>
                        )}
                        {alert.type === "low_stock" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Stock Bajo
                          </span>
                        )}
                        {alert.type === "overstock" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            Sobrestock
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`text-sm font-display font-semibold ${alert.current_stock === 0 ? "text-red-600 dark:text-rose-400" : "text-foreground"}`}>
                          {alert.current_stock ?? 0}
                        </span>
                      </td>
                      <td className="p-4 text-right hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">{alert.threshold ?? "\u2014"}</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/products/${alert.id}`}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                            title="Ver producto"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/inventory?product=${alert.id}&action=movement`}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-cyan-500/10 transition-colors text-muted-foreground hover:text-blue-600 dark:text-cyan-400"
                            title="Registrar movimiento"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DataTableWrapper>
      </div>

      {/* Resumen Stats */}
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
                <span className="text-sm text-muted-foreground">Stock Normal</span>
                <span className="font-display font-semibold text-emerald-500">
                  {(metrics?.total_products || 0) -
                    (metrics?.low_stock_count || 0) -
                    (metrics?.out_of_stock_count || 0) -
                    (metrics?.overstock_count || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Stock Bajo</span>
                <span className="font-display font-semibold text-amber-500">
                  {metrics?.low_stock_count || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Sin Stock</span>
                <span className="font-display font-semibold text-destructive">
                  {metrics?.out_of_stock_count || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Sobrestock</span>
                <span className="font-display font-semibold text-blue-500">
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

      {/* Onboarding / Empty State */}
      {(metrics?.total_products || 0) === 0 && (
        <OnboardingChecklist />
      )}
    </div>
  );
}
