"use client";

import { useState, useMemo } from "react";
import { DollarSign, TrendingUp, ShoppingCart, BarChart3, Activity } from "lucide-react";
import { fmt } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTableWrapper, tableHeaderClass, tableCellClass, tableRowClass } from "@/components/ui/data-table-wrapper";
import { FilterPanel, FilterConfig } from "@/components/ui/filter-panel";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { RevenueTrendChart } from "@/components/charts/revenue-trend-chart";
import { ExportButton } from "@/components/ui/export-button";
import { exportSalesExcel } from "@/lib/export";
import { useSales } from "@/hooks/use-data";

const SORT_OPTIONS = [
  { value: "date_desc", label: "Fecha: mas reciente" },
  { value: "date_asc", label: "Fecha: mas antigua" },
  { value: "revenue_desc", label: "Revenue: mayor a menor" },
  { value: "revenue_asc", label: "Revenue: menor a mayor" },
  { value: "profit_desc", label: "Profit: mayor a menor" },
  { value: "profit_asc", label: "Profit: menor a mayor" },
  { value: "units_desc", label: "Unidades: mayor a menor" },
  { value: "units_asc", label: "Unidades: menor a mayor" },
];

const FILTER_CONFIG: FilterConfig[] = [
  { type: "dateRange", key: "date", label: "Rango de fechas" },
  { type: "range", key: "revenue", label: "Revenue", prefix: "$", step: 0.01 },
  { type: "range", key: "profit", label: "Profit", prefix: "$", step: 0.01 },
];

export default function SalesPage() {
  const { sales, isLoading } = useSales();
  const [sortValue, setSortValue] = useState("date_desc");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    dateFrom: "",
    dateTo: "",
    revenueMin: "",
    revenueMax: "",
    profitMin: "",
    profitMax: "",
  });

  const handleFilterChange = (key: string, value: any) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilterValues({
      dateFrom: "",
      dateTo: "",
      revenueMin: "",
      revenueMax: "",
      profitMin: "",
      profitMax: "",
    });
  };

  const filtered = useMemo(() => {
    let result = sales.filter((s: any) => {
      const revenue = (s.sale_price || 0) * (s.units_sold || 0);
      const profit = s.profit || 0;
      const saleDate = s.sale_date || "";
      const matchDateFrom = !filterValues.dateFrom || saleDate >= filterValues.dateFrom;
      const matchDateTo = !filterValues.dateTo || saleDate <= filterValues.dateTo;
      const matchRevenueMin = filterValues.revenueMin === "" || revenue >= parseFloat(filterValues.revenueMin);
      const matchRevenueMax = filterValues.revenueMax === "" || revenue <= parseFloat(filterValues.revenueMax);
      const matchProfitMin = filterValues.profitMin === "" || profit >= parseFloat(filterValues.profitMin);
      const matchProfitMax = filterValues.profitMax === "" || profit <= parseFloat(filterValues.profitMax);
      return matchDateFrom && matchDateTo && matchRevenueMin && matchRevenueMax && matchProfitMin && matchProfitMax;
    });

    result.sort((a: any, b: any) => {
      const revA = (a.sale_price || 0) * (a.units_sold || 0);
      const revB = (b.sale_price || 0) * (b.units_sold || 0);
      switch (sortValue) {
        case "date_desc": return new Date(b.sale_date || 0).getTime() - new Date(a.sale_date || 0).getTime();
        case "date_asc": return new Date(a.sale_date || 0).getTime() - new Date(b.sale_date || 0).getTime();
        case "revenue_desc": return revB - revA;
        case "revenue_asc": return revA - revB;
        case "profit_desc": return (b.profit || 0) - (a.profit || 0);
        case "profit_asc": return (a.profit || 0) - (b.profit || 0);
        case "units_desc": return (b.units_sold || 0) - (a.units_sold || 0);
        case "units_asc": return (a.units_sold || 0) - (b.units_sold || 0);
        default: return 0;
      }
    });

    return result;
  }, [sales, filterValues, sortValue]);

  const chartData = useMemo(() => {
    const byDate: Record<string, { revenue: number; profit: number; units: number }> = {};
    for (const s of sales) {
      const date = (s as any).sale_date || "";
      if (!date) continue;
      if (!byDate[date]) byDate[date] = { revenue: 0, profit: 0, units: 0 };
      byDate[date].revenue += ((s as any).sale_price || 0) * ((s as any).units_sold || 0);
      byDate[date].profit += (s as any).profit || 0;
      byDate[date].units += (s as any).units_sold || 0;
    }
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, vals]) => ({
        date: new Date(date + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
        revenue: Math.round(vals.revenue * 100) / 100,
        profit: Math.round(vals.profit * 100) / 100,
        units: vals.units,
      }));
  }, [sales]);

  const totalRevenue = sales.reduce((sum: number, s: any) => sum + (s.sale_price || 0) * (s.units_sold || 0), 0);
  const totalUnits = sales.reduce((sum: number, s: any) => sum + (s.units_sold || 0), 0);
  const totalFees = sales.reduce((sum: number, s: any) => sum + (s.amazon_fees || 0), 0);
  const totalProfit = sales.reduce((sum: number, s: any) => sum + (s.profit || 0), 0);

  const handleExport = () => {
    exportSalesExcel(filtered);
  };

  if (isLoading) {
    return <PageSkeleton kpiCount={4} rowCount={8} showCharts showSearch={false} />;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader badge="VENTAS" title="Ventas" subtitle="Historial de ventas de tus productos">
        <FilterPanel
          filters={FILTER_CONFIG}
          values={filterValues}
          onChange={handleFilterChange}
          onClear={clearFilters}
          sortOptions={SORT_OPTIONS}
          sortValue={sortValue}
          onSortChange={setSortValue}
        />
        <ExportButton onClick={handleExport} />
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Revenue Total" value={fmt(totalRevenue)} icon={DollarSign} accentColor="cyan" animationDelay={0} />
        <KpiCard label="Profit Total" value={fmt(totalProfit)} icon={TrendingUp} accentColor="green" animationDelay={75} trend={totalProfit >= 0 ? "up" : "down"} trendValue={totalProfit >= 0 ? "Positivo" : "Negativo"} />
        <KpiCard label="Unidades" value={String(totalUnits)} icon={ShoppingCart} accentColor="amber" animationDelay={150} />
        <KpiCard label="Fees Amazon" value={fmt(totalFees)} icon={BarChart3} accentColor="red" animationDelay={225} />
      </div>

      {sales.length > 0 && (
        <DataTableWrapper title="Tendencia de Revenue y Profit" icon={Activity}>
          <div className="p-4"><RevenueTrendChart data={chartData} /></div>
        </DataTableWrapper>
      )}

      {sales.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground/70 mb-1">No hay ventas registradas</h3>
          <p className="text-sm text-muted-foreground">Las ventas apareceran aqui cuando se registren</p>
        </div>
      )}

      {filtered.length > 0 && (
        <DataTableWrapper title={`${filtered.length} venta${filtered.length !== 1 ? "s" : ""}`}>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className={tableHeaderClass}>Fecha</th>
                  <th className={tableHeaderClass}>Producto</th>
                  <th className={`${tableHeaderClass} text-center`}>Unidades</th>
                  <th className={`${tableHeaderClass} text-right`}>Revenue</th>
                  <th className={`${tableHeaderClass} text-right`}>Fees</th>
                  <th className={`${tableHeaderClass} text-right`}>Profit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any) => (
                  <tr key={s.id} className={tableRowClass}>
                    <td className={`${tableCellClass} text-muted-foreground`}>{new Date(s.sale_date).toLocaleDateString("es-ES")}</td>
                    <td className={`${tableCellClass} font-medium text-foreground/80`}>{s.products?.name || "N/A"}</td>
                    <td className={`${tableCellClass} text-center text-foreground/60 tabular-nums`}>{s.units_sold}</td>
                    <td className={`${tableCellClass} text-right text-foreground/70 tabular-nums`}>{fmt((s.sale_price || 0) * (s.units_sold || 0))}</td>
                    <td className={`${tableCellClass} text-right text-destructive tabular-nums`}>{fmt(s.amazon_fees)}</td>
                    <td className={`${tableCellClass} text-right font-semibold tabular-nums ${(s.profit || 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}>{fmt(s.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3 p-4">
            {filtered.map((s: any) => (
              <div key={s.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm text-foreground/80">{s.products?.name || "N/A"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.sale_date).toLocaleDateString("es-ES")}</p>
                  </div>
                  <p className={`font-bold text-sm tabular-nums ${(s.profit || 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}>{fmt(s.profit)}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Unidades</p>
                    <p className="font-bold text-sm text-foreground/70 tabular-nums">{s.units_sold}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Revenue</p>
                    <p className="font-bold text-sm text-foreground/70 tabular-nums">{fmt((s.sale_price || 0) * (s.units_sold || 0))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Fees</p>
                    <p className="font-bold text-sm text-destructive tabular-nums">{fmt(s.amazon_fees)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DataTableWrapper>
      )}

      {sales.length > 0 && filtered.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground/70 mb-1">Sin resultados</h3>
          <p className="text-sm text-muted-foreground">Intenta con otros filtros</p>
        </div>
      )}
    </div>
  );
}