"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { DollarSign, TrendingUp, ShoppingCart, BarChart3, Activity, Plus, FileUp, FileText, AlertTriangle } from "lucide-react";
import { fmt } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTableWrapper, tableHeaderClass, tableCellClass, tableRowClass } from "@/components/ui/data-table-wrapper";
import { FilterPanel, FilterConfig } from "@/components/ui/filter-panel";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { ExportButton } from "@/components/ui/export-button";
import { exportSalesExcel } from "@/lib/export";
import { useSalesQuery, useSalesSummary } from "@/hooks/use-data";
import { SaleFormModal } from "@/components/sale-form-modal";
import { toast } from "sonner";
import { PaginationControl } from "@/components/ui/pagination-control";
import type { Sale } from "@/types";
import { CSV_MAX_SIZE_MB, CSV_MAX_ROWS } from "@/lib/constants";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

const RevenueTrendChart = dynamic(
  () => import("@/components/charts/revenue-trend-chart").then((m) => m.RevenueTrendChart),
  { ssr: false, loading: () => <div className="h-[280px] animate-pulse rounded-xl bg-muted/30" /> }
);

interface EnrichedProduct {
  name: string;
  sku: string;
  unit_cost: number;
  total_cost: number;
  sale_price: number;
  fba_fee: number;
  referral_fee: number;
}

interface EnrichedSale extends Sale {
  profit: number;
  cost: number;
  products: EnrichedProduct | null;
}

const ITEMS_PER_PAGE = 20;

export default function SalesPage() {
  const { locale } = useLocale();
  const SORT_OPTIONS = [
    { value: "date_desc", label: t("sort.date_desc", locale) },
    { value: "date_asc", label: t("sort.date_asc", locale) },
    { value: "revenue_desc", label: t("sort.revenue_desc", locale) },
    { value: "revenue_asc", label: t("sort.revenue_asc", locale) },
    { value: "profit_desc", label: t("sort.profit_desc", locale) },
    { value: "profit_asc", label: t("sort.profit_asc", locale) },
    { value: "units_desc", label: t("sort.units_desc", locale) },
    { value: "units_asc", label: t("sort.units_asc", locale) },
  ];
  const FILTER_CONFIG: FilterConfig[] = [
    { type: "dateRange", key: "date", label: t("filter.date_range", locale) },
    { type: "range", key: "revenue", label: t("common.revenue", locale), prefix: "$", step: 0.01 },
    { type: "range", key: "profit", label: t("common.profit", locale), prefix: "$", step: 0.01 },
  ];
  const [sortValue, setSortValue] = useState("date_desc");
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    dateFrom: "",
    dateTo: "",
    revenueMin: "",
    revenueMax: "",
    profitMin: "",
    profitMax: "",
  });

  const tableQueryParams = useMemo(() => ({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    dateFrom: filterValues.dateFrom,
    dateTo: filterValues.dateTo,
    revenueMin: filterValues.revenueMin,
    revenueMax: filterValues.revenueMax,
    profitMin: filterValues.profitMin,
    profitMax: filterValues.profitMax,
    sort: sortValue,
  }), [currentPage, filterValues, sortValue]);

  const chartQueryParams = useMemo(() => ({
    page: 1,
    limit: 200,
    dateFrom: filterValues.dateFrom,
    dateTo: filterValues.dateTo,
    sort: "date_desc" as const,
  }), [filterValues.dateFrom, filterValues.dateTo]);

  const { sales: tableSalesRaw, pagination, isLoading, isError, mutate } = useSalesQuery(tableQueryParams);
  const { sales: chartSalesRaw } = useSalesQuery(chartQueryParams);
  const { summary, isLoading: summaryLoading, isError: summaryError } = useSalesSummary();

  const tableSales = tableSalesRaw as EnrichedSale[];
  const chartSales = chartSalesRaw as EnrichedSale[];

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
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
    setCurrentPage(1);
  };

  const chartData = useMemo(() => {
    const byDate: Record<string, { revenue: number; profit: number; units: number }> = {};
    for (const s of chartSales) {
      const date = s.sale_date || "";
      if (!date) continue;
      if (!byDate[date]) byDate[date] = { revenue: 0, profit: 0, units: 0 };
      byDate[date].revenue += s.revenue || 0;
      byDate[date].profit += s.profit || 0;
      byDate[date].units += s.units_sold || 0;
    }
    return Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map((entry) => ({
        date: new Date(entry[0] + "T12:00:00").toLocaleDateString(locale === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short" }),
        revenue: Math.round(entry[1].revenue * 100) / 100,
        profit: Math.round(entry[1].profit * 100) / 100,
        units: entry[1].units,
      }));
  }, [chartSales, locale]);

  const handleExport = () => {
    exportSalesExcel(tableSales, locale);
  };

  const handleSaleSuccess = () => {
    mutate();
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > CSV_MAX_SIZE_MB * 1024 * 1024) {
      toast.error(t("sales.csv_file_exceeds", locale).replace("{maxSize}", String(CSV_MAX_SIZE_MB)));
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length > CSV_MAX_ROWS) {
        toast.error(t("sales.csv_too_large", locale).replace("{maxRows}", String(CSV_MAX_ROWS)));
        e.target.value = "";
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const dateIdx = headers.indexOf("date");
      const skuIdx = headers.indexOf("sku");
      const unitsIdx = headers.indexOf("units");
      const revenueIdx = headers.indexOf("revenue");
      if (dateIdx < 0 || skuIdx < 0 || unitsIdx < 0) {
        toast.error(t("sales.csv_invalid", locale));
        return;
      }

      const rows = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim());
        return {
          date: cols[dateIdx] || "",
          sku: cols[skuIdx] || "",
          units: parseInt(cols[unitsIdx] || "1", 10),
          ...(revenueIdx >= 0 && cols[revenueIdx] ? { revenue: parseFloat(cols[revenueIdx]) } : {}),
        };
      });

      const toastId = toast.loading(t("sales.csv_importing", locale));
      try {
        const res = await fetch("/api/sales/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows }),
        });
        const result = await res.json();
        if (!res.ok) {
          toast.error(result.error || t("sales.csv_import_error", locale), { id: toastId });
        } else {
          const msg = result.skipped > 0
            ? `${result.imported} ${t("sales.csv_imported", locale)}, ${result.skipped} ${t("sales.csv_skipped", locale)}`
            : `${result.imported} ${t("sales.csv_imported", locale)}`;
          toast.success(msg, { id: toastId });
          mutate();
        }
      } catch {
        toast.error(t("sales.csv_import_error", locale), { id: toastId });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleGeneratePDF = async () => {
    const [{ default: jsPDF }, autoTable] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable").then((m) => m.default),
    ]);
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(t("sales.pdf_title", locale), 14, 20);
    doc.setFontSize(10);
    doc.text(t("sales.pdf_period", locale) + " " + new Date().toLocaleDateString(locale === "en" ? "en-US" : "es-ES", { month: "long", year: "numeric" }), 14, 30);
    doc.text(t("sales.pdf_total_revenue", locale) + " " + fmt(summary.totalRevenue), 14, 40);
    doc.text(t("sales.pdf_total_profit", locale) + " " + fmt(summary.totalProfit), 14, 48);
    doc.text(t("sales.pdf_total_units", locale) + " " + summary.totalUnits, 14, 56);
    doc.text(t("sales.pdf_total_fees", locale) + " " + fmt(summary.totalFees), 14, 64);

    const pdfData = chartSales.slice(0, 50).map((s) => [
      s.sale_date,
      s.products ? s.products.name : t("common.na", locale),
      String(s.units_sold),
      fmt(s.revenue),
      fmt(s.amazon_fees),
      fmt(s.profit),
    ]);

    if (pdfData.length > 0) {
      autoTable(doc, {
        startY: 72,
        head: [[t("sales.table_date", locale), t("sales.table_product", locale), t("sales.table_units", locale), t("sales.table_revenue", locale), t("sales.table_fees", locale), t("sales.table_profit", locale)]],
        body: pdfData,
        theme: "grid",
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 172, 210] },
      });
    }
    doc.save(t("sales.pdf_filename_prefix", locale) + new Date().toISOString().split("T")[0] + ".pdf");
    toast.success(t("sales.pdf_success", locale));
  };

  const isPageLoading = isLoading || summaryLoading;

  if (isPageLoading) {
    return <PageSkeleton kpiCount={4} rowCount={8} showCharts showSearch={false} />;
  }

  if (isError || summaryError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-1">{t("sales.error_title", locale)}</p>
          <p className="text-sm text-muted-foreground mb-4">{t("sales.error_desc", locale)}</p>
        </div>
        <button
          onClick={() => mutate()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          {t("common.retry", locale)}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader badge={t("badge.sales", locale)} title={t("sales.title", locale)} subtitle={t("sales.subtitle", locale)} breadcrumbs={[{ label: t("nav.dashboard", locale), href: "/dashboard" }, { label: t("nav.sales", locale) }]}>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("sales.register_sale", locale)}
        </button>
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
          <FileUp className="h-4 w-4" />
          {t("sales.import_csv", locale)}
          <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
        </label>
        <button
          onClick={handleGeneratePDF}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <FileText className="h-4 w-4" />
          {t("sales.pdf_report", locale)}
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
        <KpiCard label={t("sales.kpi_total_revenue", locale)} value={fmt(summary.totalRevenue)} icon={DollarSign} accentColor="cyan" animationDelay={0} />
        <KpiCard label={t("sales.kpi_total_profit", locale)} value={fmt(summary.totalProfit)} icon={TrendingUp} accentColor="green" animationDelay={75} trend={summary.totalProfit >= 0 ? "up" : "down"} trendValue={summary.totalProfit >= 0 ? t("common.positive", locale) : t("common.negative", locale)} />
        <KpiCard label={t("sales.kpi_total_units", locale)} value={String(summary.totalUnits)} icon={ShoppingCart} accentColor="amber" animationDelay={150} />
        <KpiCard label={t("sales.kpi_fees", locale)} value={fmt(summary.totalFees)} icon={BarChart3} accentColor="red" animationDelay={225} />
      </div>

      {chartSales.length > 0 && (
        <DataTableWrapper title={t("sales.chart_title", locale)} icon={Activity}>
          <div className="p-4"><RevenueTrendChart data={chartData} /></div>
        </DataTableWrapper>
      )}

      {tableSales.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground/70 mb-1">{t("sales.no_sales", locale)}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t("sales.no_sales_desc", locale)}</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t("sales.register_first", locale)}
          </button>
        </div>
      )}

      {tableSales.length > 0 && (
        <DataTableWrapper title={t("sales.count", locale).replace("{count}", String(pagination.total))}>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className={tableHeaderClass}>{t("sales.table_date", locale)}</th>
                  <th scope="col" className={tableHeaderClass}>{t("sales.table_product", locale)}</th>
                  <th scope="col" className={`${tableHeaderClass} text-center`}>{t("sales.table_units", locale)}</th>
                  <th scope="col" className={`${tableHeaderClass} text-end`}>{t("sales.table_revenue", locale)}</th>
                  <th scope="col" className={`${tableHeaderClass} text-end`}>{t("sales.table_fees", locale)}</th>
                  <th scope="col" className={`${tableHeaderClass} text-end`}>{t("sales.table_profit", locale)}</th>
                </tr>
              </thead>
              <tbody>
                {tableSales.map((s) => {
                  const profitClass = (s.profit || 0) >= 0 ? "text-emerald-500" : "text-red-500";
                  return (
                    <tr key={s.id} className={tableRowClass}>
                      <td className={`${tableCellClass} text-muted-foreground`}>{new Date(s.sale_date).toLocaleDateString(locale === "en" ? "en-US" : "es-ES")}</td>
                      <td className={`${tableCellClass} font-medium text-foreground/80`}>{s.products ? s.products.name : t("common.na", locale)}</td>
                      <td className={`${tableCellClass} text-center text-foreground/60 tabular-nums`}>{s.units_sold}</td>
                      <td className={`${tableCellClass} text-end text-foreground/70 tabular-nums`}>{fmt(s.revenue)}</td>
                      <td className={`${tableCellClass} text-end text-destructive tabular-nums`}>{fmt(s.amazon_fees)}</td>
                      <td className={`${tableCellClass} text-end font-semibold tabular-nums ${profitClass}`}>{fmt(s.profit)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3 p-4">
            {tableSales.map((s) => {
              const profitColorMobile = (s.profit || 0) >= 0 ? "text-emerald-500" : "text-red-500";
              return (
                <div key={s.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm text-foreground/80">{s.products ? s.products.name : t("common.na", locale)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(s.sale_date).toLocaleDateString(locale === "en" ? "en-US" : "es-ES")}</p>
                    </div>
                    <p className={`font-bold text-sm tabular-nums ${profitColorMobile}`}>{fmt(s.profit)}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mt-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("sales.mobile_units", locale)}</p>
                      <p className="font-bold text-sm text-foreground/70 tabular-nums">{s.units_sold}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("sales.mobile_revenue", locale)}</p>
                      <p className="font-bold text-sm text-foreground/70 tabular-nums">{fmt(s.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("sales.mobile_fees", locale)}</p>
                      <p className="font-bold text-sm text-destructive tabular-nums">{fmt(s.amazon_fees)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {pagination.total > ITEMS_PER_PAGE && (
            <div className="p-4 border-t border-border">
              <PaginationControl
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </DataTableWrapper>
      )}

      {chartSales.length > 0 && tableSales.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground/70 mb-1">{t("common.no_results", locale)}</h3>
          <p className="text-sm text-muted-foreground">{t("common.try_different_filters", locale)}</p>
        </div>
      )}

      <SaleFormModal open={showModal} onOpenChange={setShowModal} onSuccess={handleSaleSuccess} />
    </div>
  );
}
