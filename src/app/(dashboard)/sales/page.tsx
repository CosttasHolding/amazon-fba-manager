"use client";

import { useState, useMemo } from "react";
import { DollarSign, TrendingUp, ShoppingCart, BarChart3, Activity, Plus } from "lucide-react";
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
import { SaleFormModal } from "@/components/sale-form-modal";

var SORT_OPTIONS = [
  { value: "date_desc", label: "Fecha: mas reciente" },
  { value: "date_asc", label: "Fecha: mas antigua" },
  { value: "revenue_desc", label: "Revenue: mayor a menor" },
  { value: "revenue_asc", label: "Revenue: menor a mayor" },
  { value: "profit_desc", label: "Profit: mayor a menor" },
  { value: "profit_asc", label: "Profit: menor a mayor" },
  { value: "units_desc", label: "Unidades: mayor a menor" },
  { value: "units_asc", label: "Unidades: menor a mayor" },
];

var FILTER_CONFIG: FilterConfig[] = [
  { type: "dateRange", key: "date", label: "Rango de fechas" },
  { type: "range", key: "revenue", label: "Revenue", prefix: "$", step: 0.01 },
  { type: "range", key: "profit", label: "Profit", prefix: "$", step: 0.01 },
];

export default function SalesPage() {
  var { sales, isLoading, mutate } = useSales();
  var [sortValue, setSortValue] = useState("date_desc");
  var [showModal, setShowModal] = useState(false);
  var [filterValues, setFilterValues] = useState<Record<string, any>>({
    dateFrom: "",
    dateTo: "",
    revenueMin: "",
    revenueMax: "",
    profitMin: "",
    profitMax: "",
  });

  var handleFilterChange = function(key: string, value: any) {
    setFilterValues(function(prev) { return Object.assign({}, prev, { [key]: value }); });
  };

  var clearFilters = function() {
    setFilterValues({
      dateFrom: "",
      dateTo: "",
      revenueMin: "",
      revenueMax: "",
      profitMin: "",
      profitMax: "",
    });
  };

  var filtered = useMemo(function() {
    var result = sales.filter(function(s: any) {
      var rev = s.revenue || 0;
      var prof = s.profit || 0;
      var sd = s.sale_date || "";
      var ok1 = !filterValues.dateFrom || sd >= filterValues.dateFrom;
      var ok2 = !filterValues.dateTo || sd <= filterValues.dateTo;
      var ok3 = filterValues.revenueMin === "" || rev >= parseFloat(filterValues.revenueMin);
      var ok4 = filterValues.revenueMax === "" || rev <= parseFloat(filterValues.revenueMax);
      var ok5 = filterValues.profitMin === "" || prof >= parseFloat(filterValues.profitMin);
      var ok6 = filterValues.profitMax === "" || prof <= parseFloat(filterValues.profitMax);
      return ok1 && ok2 && ok3 && ok4 && ok5 && ok6;
    });

    result.sort(function(a: any, b: any) {
      switch (sortValue) {
        case "date_desc": return new Date(b.sale_date || 0).getTime() - new Date(a.sale_date || 0).getTime();
        case "date_asc": return new Date(a.sale_date || 0).getTime() - new Date(b.sale_date || 0).getTime();
        case "revenue_desc": return (b.revenue || 0) - (a.revenue || 0);
        case "revenue_asc": return (a.revenue || 0) - (b.revenue || 0);
        case "profit_desc": return (b.profit || 0) - (a.profit || 0);
        case "profit_asc": return (a.profit || 0) - (b.profit || 0);
        case "units_desc": return (b.units_sold || 0) - (a.units_sold || 0);
        case "units_asc": return (a.units_sold || 0) - (b.units_sold || 0);
        default: return 0;
      }
    });

    return result;
  }, [sales, filterValues, sortValue]);

  var chartData = useMemo(function() {
    var byDate: Record<string, { revenue: number; profit: number; units: number }> = {};
    for (var i = 0; i < sales.length; i++) {
      var s = sales[i] as any;
      var date = s.sale_date || "";
      if (!date) continue;
      if (!byDate[date]) byDate[date] = { revenue: 0, profit: 0, units: 0 };
      byDate[date].revenue += s.revenue || 0;
      byDate[date].profit += s.profit || 0;
      byDate[date].units += s.units_sold || 0;
    }
    return Object.entries(byDate)
      .sort(function(a, b) { return a[0].localeCompare(b[0]); })
      .slice(-30)
      .map(function(entry) {
        return {
          date: new Date(entry[0] + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
          revenue: Math.round(entry[1].revenue * 100) / 100,
          profit: Math.round(entry[1].profit * 100) / 100,
          units: entry[1].units,
        };
      });
  }, [sales]);

  var totalRevenue = sales.reduce(function(sum: number, s: any) { return sum + (s.revenue || 0); }, 0);
  var totalUnits = sales.reduce(function(sum: number, s: any) { return sum + (s.units_sold || 0); }, 0);
  var totalFees = sales.reduce(function(sum: number, s: any) { return sum + (s.amazon_fees || 0); }, 0);
  var totalProfit = sales.reduce(function(sum: number, s: any) { return sum + (s.profit || 0); }, 0);

  var handleExport = function() {
    exportSalesExcel(filtered);
  };

  var handleSaleSuccess = function() {
    mutate();
  };

  if (isLoading) {
    return <PageSkeleton kpiCount={4} rowCount={8} showCharts showSearch={false} />;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader badge="VENTAS" title="Ventas" subtitle="Historial de ventas de tus productos">
        <button
          onClick={function() { setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Registrar Venta
        </button>
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
          <p className="text-sm text-muted-foreground mb-4">Las ventas apareceran aqui cuando se registren</p>
          <button
            onClick={function() { setShowModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Registrar primera venta
          </button>
        </div>
      )}

      {filtered.length > 0 && (
        <DataTableWrapper title={filtered.length + " venta" + (filtered.length !== 1 ? "s" : "")}>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className={tableHeaderClass}>Fecha</th>
                  <th className={tableHeaderClass}>Producto</th>
                  <th className={tableHeaderClass + " text-center"}>Unidades</th>
                  <th className={tableHeaderClass + " text-right"}>Revenue</th>
                  <th className={tableHeaderClass + " text-right"}>Fees</th>
                  <th className={tableHeaderClass + " text-right"}>Profit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(function(s: any) {
                  var profitClass = (s.profit || 0) >= 0 ? "text-emerald-500" : "text-red-500";
                  return (
                    <tr key={s.id} className={tableRowClass}>
                      <td className={tableCellClass + " text-muted-foreground"}>{new Date(s.sale_date).toLocaleDateString("es-ES")}</td>
                      <td className={tableCellClass + " font-medium text-foreground/80"}>{s.products ? s.products.name : "N/A"}</td>
                      <td className={tableCellClass + " text-center text-foreground/60 tabular-nums"}>{s.units_sold}</td>
                      <td className={tableCellClass + " text-right text-foreground/70 tabular-nums"}>{fmt(s.revenue)}</td>
                      <td className={tableCellClass + " text-right text-destructive tabular-nums"}>{fmt(s.amazon_fees)}</td>
                      <td className={tableCellClass + " text-right font-semibold tabular-nums " + profitClass}>{fmt(s.profit)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3 p-4">
            {filtered.map(function(s: any) {
              var profitColorMobile = (s.profit || 0) >= 0 ? "text-emerald-500" : "text-red-500";
              return (
                <div key={s.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm text-foreground/80">{s.products ? s.products.name : "N/A"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(s.sale_date).toLocaleDateString("es-ES")}</p>
                    </div>
                    <p className={"font-bold text-sm tabular-nums " + profitColorMobile}>{fmt(s.profit)}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mt-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Unidades</p>
                      <p className="font-bold text-sm text-foreground/70 tabular-nums">{s.units_sold}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Revenue</p>
                      <p className="font-bold text-sm text-foreground/70 tabular-nums">{fmt(s.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Fees</p>
                      <p className="font-bold text-sm text-destructive tabular-nums">{fmt(s.amazon_fees)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
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

      <SaleFormModal open={showModal} onOpenChange={setShowModal} onSuccess={handleSaleSuccess} />
    </div>
  );
}