"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Package,
  Search,
  AlertTriangle,
  TrendingDown,
  Archive,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DataTableWrapper,
  tableHeaderClass,
  tableCellClass,
  tableRowClass,
} from "@/components/ui/data-table-wrapper";
import { ExportButton } from "@/components/ui/export-button";
import { FilterPanel, FilterConfig } from "@/components/ui/filter-panel";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControl } from "@/components/ui/pagination-control";
import { exportInventoryExcel } from "@/lib/export";
import { useInventoryQuery, useInventorySummary } from "@/hooks/use-data";
import { useDebounce } from "@/hooks/use-debounce";
import { ProductWithInventory } from "@/types";
import { BarcodeScannerButton } from "@/components/barcode-scanner";
import { STOCK_STATUS_OPTIONS, DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Locale } from "@/lib/i18n/translations";

const stockVariant = (status: string): "success" | "warning" | "danger" | "info" | "neutral" => {
  switch (status) {
    case "low_stock": return "warning";
    case "out_of_stock": return "danger";
    case "overstock": return "info";
    default: return "success";
  }
};

const stockLabel = (status: string, locale: Locale) => {
  const map: Record<string, string> = {
    low_stock: t("inventory.low_stock", locale),
    out_of_stock: t("inventory.out_of_stock", locale),
    overstock: t("inventory.overstock", locale),
    normal: t("inventory.stock_normal", locale),
  };
  return map[status] || map.normal;
};

function getSortOptions(locale: Locale) {
  return [
    { value: "name_asc", label: t("sort.name_asc", locale) },
    { value: "name_desc", label: t("sort.name_desc", locale) },
    { value: "stock_asc", label: t("sort.stock_asc", locale) },
    { value: "stock_desc", label: t("sort.stock_desc", locale) },
    { value: "available_asc", label: t("sort.available_asc", locale) },
    { value: "available_desc", label: t("sort.available_desc", locale) },
    { value: "days_asc", label: t("sort.stock_days_asc", locale) },
    { value: "days_desc", label: t("sort.stock_days_desc", locale) },
  ];
}

function getFilterConfig(locale: Locale): FilterConfig[] {
  return [
    {
      type: "select",
      key: "stockStatus",
      label: t("filter.stock_status", locale),
      options: STOCK_STATUS_OPTIONS,
      color: "amber",
    },
    {
      type: "range",
      key: "available",
      label: t("filter.available_units", locale),
      step: 1,
    },
  ];
}

const ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE;

function StockProjection({ p, locale }: { p: ProductWithInventory; locale: Locale }) {
  const days = p.days_of_stock;
  if (days === null || days === undefined) return <span className="text-xs text-muted-foreground">—</span>;
  if (days <= 0) return <span className="text-xs text-red-600 dark:text-rose-400 font-semibold">{t("inventory.no_stock", locale)}</span>;
  if (days <= 14) return <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">{t("inventory.critical_days", locale).replace("{days}", String(days))}</span>;
  if (days <= 30) return <span className="text-xs text-amber-300">{t("inventory.low_days", locale).replace("{days}", String(days))}</span>;
  return <span className="text-xs text-green-600 dark:text-emerald-400">{t("inventory.days_unit", locale).replace("{days}", String(days))}</span>;
}

function StockoutDate({ p, locale }: { p: ProductWithInventory; locale: Locale }) {
  const days = p.days_of_stock;
  if (!days || days <= 0) return <span className="text-xs text-muted-foreground">—</span>;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return <span className="text-xs text-muted-foreground">{date.toLocaleDateString(locale === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short" })}</span>;
}

export default function InventoryPage() {
  const { locale } = useLocale();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [sortValue, setSortValue] = useState("name_asc");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    stockStatus: "",
    availableMin: "",
    availableMax: "",
  });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const queryParams = useMemo(() => ({
    page: currentPage,
    perPage: ITEMS_PER_PAGE,
    search,
    stockStatus: filterValues.stockStatus,
    availableMin: filterValues.availableMin,
    availableMax: filterValues.availableMax,
    sort: sortValue,
  }), [currentPage, search, filterValues, sortValue]);

  const { inventory, pagination, isLoading, isError, mutate } = useInventoryQuery(queryParams);
  const { summary, isLoading: summaryLoading, isError: summaryError } = useInventorySummary();

  const exportQuery = useInventoryQuery({
    ...queryParams,
    page: 1,
    perPage: 200,
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilterValues({
      stockStatus: "",
      availableMin: "",
      availableMax: "",
    });
    setCurrentPage(1);
  };

  const handleExport = () => {
    exportInventoryExcel(exportQuery.inventory, locale);
  };

  const isPageLoading = isLoading || summaryLoading;

  if (isPageLoading) {
    return <PageSkeleton kpiCount={4} rowCount={6} showSearch />;
  }

  if (isError || summaryError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-1">{t("common.error_load_data", locale)}</p>
          <p className="text-sm text-muted-foreground mb-4">{t("inventory.error_load", locale)}</p>
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
      <PageHeader
        badge={t("badge.inventory", locale)}
        title={t("nav.inventory", locale)}
        subtitle={t("inventory.subtitle", locale)}
        breadcrumbs={[{ label: t("nav.dashboard", locale), href: "/dashboard" }, { label: t("nav.inventory", locale) }]}
      >
        <FilterPanel
          filters={getFilterConfig(locale)}
          values={filterValues}
          onChange={handleFilterChange}
          onClear={clearFilters}
          sortOptions={getSortOptions(locale)}
          sortValue={sortValue}
          onSortChange={setSortValue}
        />
        <ExportButton onClick={handleExport} />
        <button
          onClick={() => mutate()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          {t("common.refresh", locale)}
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t("inventory.total_units", locale)}
          value={String(summary.totalUnits)}
          icon={Package}
          accentColor="cyan"
          animationDelay={0}
        />
        <KpiCard
          label={t("inventory.low_stock", locale)}
          value={String(summary.lowStockCount)}
          icon={AlertTriangle}
          accentColor="amber"
          animationDelay={75}
          trend={summary.lowStockCount > 0 ? "down" : "neutral"}
          trendValue={summary.lowStockCount > 0 ? t("inventory.needs_attention", locale) : t("inventory.ok", locale)}
        />
        <KpiCard
          label={t("inventory.out_of_stock", locale)}
          value={String(summary.outOfStockCount)}
          icon={TrendingDown}
          accentColor="red"
          animationDelay={150}
          trend={summary.outOfStockCount > 0 ? "down" : "neutral"}
          trendValue={summary.outOfStockCount > 0 ? t("inventory.critical", locale) : t("inventory.ok", locale)}
        />
        <KpiCard
          label={t("inventory.excess_stock", locale)}
          value={String(summary.overstockCount)}
          icon={Archive}
          accentColor="purple"
          animationDelay={225}
        />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label={t("inventory.search_aria_label", locale)}
            placeholder={t("inventory.search_placeholder", locale)}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="ps-9 bg-muted/50 border-border"
          />
        </div>
        <BarcodeScannerButton onScan={(code) => setSearchInput(code)} />
      </div>

      {inventory.length === 0 && (
        <EmptyState
          icon={Package}
          title={Object.values(filterValues).some(Boolean) ? t("common.no_results", locale) : t("inventory.no_data", locale)}
          subtitle={Object.values(filterValues).some(Boolean) ? t("common.try_different_filters", locale) : t("inventory.add_products_hint", locale)}
        />
      )}

      {inventory.length > 0 && (
        <DataTableWrapper
          title={`${pagination.total} ${t(pagination.total === 1 ? "inventory.product_count_one" : "inventory.product_count_other", locale)}`}
        >
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className={tableHeaderClass}>{t("common.sku", locale)}</th>
                  <th scope="col" className={tableHeaderClass}>{t("common.product", locale)}</th>
                  <th scope="col" className={`${tableHeaderClass} text-center`}>{t("inventory.available", locale)}</th>
                  <th scope="col" className={`${tableHeaderClass} text-center`}>{t("inventory.in_transit", locale)}</th>
                  <th scope="col" className={`${tableHeaderClass} text-center`}>{t("inventory.warehouse", locale)}</th>
                  <th scope="col" className={`${tableHeaderClass} text-center`}>{t("common.total", locale)}</th>
                  <th scope="col" className={`${tableHeaderClass} text-center`}>{t("inventory.stock_days", locale)}</th>
                  <th scope="col" className={`${tableHeaderClass} text-center`}>{t("inventory.stockout", locale)}</th>
                  <th scope="col" className={`${tableHeaderClass} text-center`}>{t("common.status", locale)}</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((p: ProductWithInventory) => {
                  const total = (p.stock_available || 0) + (p.stock_inbound || 0) + (p.stock_warehouse || 0);
                  return (
                    <tr key={p.id} className={tableRowClass}>
                      <td className={`${tableCellClass} font-mono text-xs text-muted-foreground`}>
                        {p.sku}
                      </td>
                      <td className={`${tableCellClass} font-medium text-foreground/80`}>
                        {p.name}
                      </td>
                      <td className={`${tableCellClass} text-center text-foreground/60 tabular-nums`}>
                        {p.stock_available || 0}
                      </td>
                      <td className={`${tableCellClass} text-center text-foreground/60 tabular-nums`}>
                        {p.stock_inbound || 0}
                      </td>
                      <td className={`${tableCellClass} text-center text-foreground/60 tabular-nums`}>
                        {p.stock_warehouse || 0}
                      </td>
                      <td className={`${tableCellClass} text-center font-bold text-foreground tabular-nums`}>
                        {total}
                      </td>
                      <td className={`${tableCellClass} text-center`}>
                        <StockProjection p={p} locale={locale} />
                      </td>
                      <td className={`${tableCellClass} text-center`}>
                        <StockoutDate p={p} locale={locale} />
                      </td>
                      <td className={`${tableCellClass} text-center`}>
                        <StatusBadge
                          status={stockLabel(p.stock_status || "normal", locale)}
                          variant={stockVariant(p.stock_status || "normal")}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3 p-4">
            {inventory.map((p: ProductWithInventory) => {
              const total = (p.stock_available || 0) + (p.stock_inbound || 0) + (p.stock_warehouse || 0);
              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-sm text-foreground/80">{p.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                    </div>
                    <StatusBadge
                      status={stockLabel(p.stock_status || "normal", locale)}
                      variant={stockVariant(p.stock_status || "normal")}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("inventory.available", locale)}</p>
                      <p className="font-bold text-sm text-foreground/70 tabular-nums">{p.stock_available || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("inventory.in_transit", locale)}</p>
                      <p className="font-bold text-sm text-foreground/70 tabular-nums">{p.stock_inbound || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("inventory.warehouse", locale)}</p>
                      <p className="font-bold text-sm text-foreground/70 tabular-nums">{p.stock_warehouse || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("common.total", locale)}</p>
                      <p className="font-bold text-sm text-primary tabular-nums">{total}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <StockProjection p={p} locale={locale} />
                    <StockoutDate p={p} locale={locale} />
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
    </div>
  );
}
