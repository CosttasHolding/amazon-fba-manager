"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { fmt, fmtPct, roiColor, profitColor } from "@/lib/utils";
import { Search, Plus, Package, TrendingUp, DollarSign, BarChart3, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTableWrapper, tableHeaderClass, tableRowClass, tableCellClass } from "@/components/ui/data-table-wrapper";
import { PaginationControl } from "@/components/ui/pagination-control";
import { ProductFormModal } from "@/components/product-form-modal";
import { ExportButton } from "@/components/ui/export-button";
import { FilterPanel, FilterConfig } from "@/components/ui/filter-panel";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { exportProductsExcel } from "@/lib/export";
import { useProductsQuery, useProductSummary } from "@/hooks/use-data";
import { useDebounce } from "@/hooks/use-debounce";
import { ProductWithInventory } from "@/types";
import { MARKETPLACES, DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { BarcodeScannerButton } from "@/components/barcode-scanner";

const ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE;

export default function ProductsPage() {
  const router = useRouter();
  const { locale } = useLocale();

  const SORT_OPTIONS = [
    { value: "newest", label: t("sort.newest", locale) },
    { value: "oldest", label: t("sort.oldest", locale) },
    { value: "name_asc", label: t("sort.name_asc", locale) },
    { value: "name_desc", label: t("sort.name_desc", locale) },
    { value: "price_asc", label: t("sort.price_asc", locale) },
    { value: "price_desc", label: t("sort.price_desc", locale) },
    { value: "profit_asc", label: t("sort.profit_asc", locale) },
    { value: "profit_desc", label: t("sort.profit_desc", locale) },
    { value: "roi_asc", label: t("sort.roi_asc", locale) },
    { value: "roi_desc", label: t("sort.roi_desc", locale) },
    { value: "stock_asc", label: t("sort.stock_asc", locale) },
    { value: "stock_desc", label: t("sort.stock_desc", locale) },
  ];

  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [sortValue, setSortValue] = useState("newest");

  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    status: "",
    stockStatus: "",
    category: "",
    marketplace: "",
    priceMin: "",
    priceMax: "",
    roiMin: "",
    roiMax: "",
  });

  const queryParams = useMemo(() => ({
    page: currentPage,
    perPage: ITEMS_PER_PAGE,
    search,
    status: filterValues.status,
    stockStatus: filterValues.stockStatus,
    category: filterValues.category,
    marketplace: filterValues.marketplace,
    priceMin: filterValues.priceMin,
    priceMax: filterValues.priceMax,
    roiMin: filterValues.roiMin,
    roiMax: filterValues.roiMax,
    sort: sortValue,
  }), [currentPage, search, filterValues, sortValue]);

  const { products, pagination, isLoading, isError, mutate } = useProductsQuery(queryParams);
  const { summary, isLoading: summaryLoading, isError: summaryError } = useProductSummary();

  const exportQuery = useProductsQuery({
    ...queryParams,
    page: 1,
    perPage: 200,
  });

  const filterConfig: FilterConfig[] = useMemo(() => {
    const STATUS_OPTIONS = [
      { value: "", label: t("common.all_statuses", locale) },
      { value: "active", label: t("products.status_active", locale) },
      { value: "paused", label: t("products.status_paused", locale) },
      { value: "discontinued", label: t("products.status_discontinued", locale) },
    ];
    const STOCK_STATUS_OPTIONS = [
      { value: "", label: t("common.all_stock", locale) },
      { value: "out_of_stock", label: t("inventory.out_of_stock", locale) },
      { value: "low_stock", label: t("inventory.low_stock", locale) },
      { value: "in_stock", label: t("inventory.in_stock", locale) },
    ];
    const MARKETPLACE_OPTIONS = [
      { value: "", label: t("common.all", locale) },
      ...MARKETPLACES.map((m) => ({ value: m.value, label: m.label })),
    ];
    return [
      {
        type: "select",
        key: "status",
        label: t("filter.status", locale),
        options: STATUS_OPTIONS,
        color: "primary",
      },
      {
        type: "select",
        key: "stockStatus",
        label: t("filter.stock_status", locale),
        options: STOCK_STATUS_OPTIONS,
        color: "red",
      },
      {
        type: "select",
        key: "category",
        label: t("filter.category", locale),
        options: [
          { value: "", label: t("common.all_categories", locale) },
          ...(summary.categories || []).map((c: string) => ({ value: c, label: c })),
        ],
        color: "purple",
      },
      {
        type: "select",
        key: "marketplace",
        label: t("filter.marketplace", locale),
        options: MARKETPLACE_OPTIONS,
        color: "green",
      },
      {
        type: "range",
        key: "price",
        label: t("filter.price_range", locale),
        prefix: "$",
        step: 0.01,
      },
      {
        type: "range",
        key: "roi",
        label: t("filter.roi_range", locale),
        suffix: "%",
        step: 1,
      },
    ];
  }, [summary.categories, locale]);

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilterValues({
      status: "",
      stockStatus: "",
      category: "",
      marketplace: "",
      priceMin: "",
      priceMax: "",
      roiMin: "",
      roiMax: "",
    });
    setCurrentPage(1);
  };

  const handleExport = () => {
    exportProductsExcel(exportQuery.products, locale);
  };

  const isPageLoading = isLoading || summaryLoading;

  if (isPageLoading) {
    return <PageSkeleton kpiCount={4} rowCount={8} showSearch />;
  }

  if (isError || summaryError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-1">{t("common.error_load_data", locale)}</p>
          <p className="text-sm text-muted-foreground mb-4">{t("products.error_subtitle", locale)}</p>
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
    <div>
      <PageHeader
        badge={t("badge.inventory", locale)}
        title={t("products.title", locale)}
        subtitle={t("products.subtitle", locale).replace("{count}", String(summary.totalCount))}
        breadcrumbs={[{ label: t("nav.dashboard", locale), href: "/dashboard" }, { label: t("nav.products", locale) }]}
      >
        <FilterPanel
          filters={filterConfig}
          values={filterValues}
          onChange={handleFilterChange}
          onClear={clearFilters}
          sortOptions={SORT_OPTIONS}
          sortValue={sortValue}
          onSortChange={setSortValue}
        />

        <ExportButton onClick={handleExport} />

        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200"
          onClick={() => setShowNewModal(true)}
        >
          <Plus className="w-4 h-4" />
          {t("products.new_product", locale)}
        </button>
      </PageHeader>

      <ProductFormModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onSuccess={() => mutate()}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label={t("kpi.total_products", locale)}
          value={String(summary.totalCount)}
          subtitle={`${summary.activeCount} ${t("kpi.active_count", locale)}`}
          icon={Package}
          accentColor="cyan"
          animationDelay={0}
        />
        <KpiCard
          label={t("kpi.avg_roi", locale)}
          value={fmtPct(summary.avgRoi)}
          icon={TrendingUp}
          accentColor="green"
          trend={summary.avgRoi >= 20 ? "up" : summary.avgRoi > 0 ? "neutral" : "down"}
          trendValue={summary.avgRoi >= 20 ? t("kpi.healthy", locale) : t("common.review", locale)}
          animationDelay={75}
        />
        <KpiCard
          label={t("kpi.total_profit", locale)}
          value={fmt(summary.totalProfit)}
          icon={DollarSign}
          accentColor="green"
          animationDelay={150}
        />
        <KpiCard
          label={t("kpi.avg_price", locale)}
          value={fmt(summary.avgPrice)}
          icon={BarChart3}
          accentColor="purple"
          animationDelay={225}
        />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            aria-label={t("products.search_aria_label", locale)}
            placeholder={t("products.search_placeholder", locale)}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="ps-9 bg-muted/50 border-border"
          />
        </div>
        <BarcodeScannerButton onScan={(code) => setSearchInput(code)} />
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={searchInput || Object.values(filterValues).some(Boolean) ? t("common.no_results", locale) : t("products.empty.no_products", locale)}
            subtitle={searchInput || Object.values(filterValues).some(Boolean) ? t("common.try_different_filters", locale) : t("products.empty.add_first", locale)}
            action={!searchInput && !Object.values(filterValues).some(Boolean) ? { label: t("products.create_product", locale), onClick: () => setShowNewModal(true) } : undefined}
          />
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              role="button"
              tabIndex={0}
              className="rounded-2xl border border-border bg-card p-4 cursor-pointer active:scale-[0.98] transition-all hover:border-border/80"
              onClick={() => router.push(`/products/${product.id}`)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/products/${product.id}`); } }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-sm text-foreground">{product.name}</p>
                  <p className="text-xs text-muted-foreground font-display">{product.sku}</p>
                </div>
                <StatusBadge status={product.status} size="sm" />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <p className="font-display uppercase text-[10px] tracking-wider text-muted-foreground">{t("common.price", locale)}</p>
                  <p className="text-sm font-medium text-foreground">{fmt(product.sale_price)}</p>
                </div>
                <div>
                  <p className="font-display uppercase text-[10px] tracking-wider text-muted-foreground">{t("common.profit", locale)}</p>
                  <p className={`text-sm font-medium ${profitColor(product.net_profit)}`}>
                    {fmt(product.net_profit)}
                  </p>
                </div>
                <div>
                  <p className="font-display uppercase text-[10px] tracking-wider text-muted-foreground">{t("common.roi", locale)}</p>
                  <p className={`text-sm font-medium ${roiColor(product.roi)}`}>
                    {fmtPct(product.roi)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        {pagination.total > ITEMS_PER_PAGE && products.length > 0 && (
          <div className="py-3">
            <PaginationControl
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        <DataTableWrapper>
          {products.length === 0 ? (
            <EmptyState
              icon={Package}
              title={search || Object.values(filterValues).some(Boolean) ? t("common.no_results", locale) : t("products.empty.no_products", locale)}
              subtitle={search || Object.values(filterValues).some(Boolean) ? t("common.try_different_filters", locale) : t("products.empty.add_first", locale)}
              action={!search && !Object.values(filterValues).some(Boolean) ? { label: t("products.create_product", locale), onClick: () => setShowNewModal(true) } : undefined}
            />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className={tableHeaderClass}>{t("common.product", locale)}</th>
                  <th scope="col" className={tableHeaderClass}>{t("common.category", locale)}</th>
                  <th scope="col" className={`${tableHeaderClass} text-end`}>{t("products.table.price_cost", locale)}</th>
                  <th scope="col" className={`${tableHeaderClass} text-end`}>{t("common.profit", locale)}</th>
                  <th scope="col" className={`${tableHeaderClass} text-end`}>{t("common.roi", locale)}</th>
                  <th scope="col" className={`${tableHeaderClass} text-center`}>{t("common.stock", locale)}</th>
                  <th scope="col" className={`${tableHeaderClass} text-center`}>{t("common.status", locale)}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className={`${tableRowClass} cursor-pointer`}
                    onClick={() => router.push(`/products/${product.id}`)}
                  >
                    <td className={tableCellClass}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted/50 border border-border flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{product.name}</p>
                          <p className="text-xs text-muted-foreground font-display">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`${tableCellClass} text-muted-foreground`}>
                      {product.category || "—"}
                    </td>
                    <td className={`${tableCellClass} text-end`}>
                      <p className="text-sm font-medium text-foreground">{fmt(product.sale_price)}</p>
                      <p className="text-xs text-muted-foreground">{fmt(product.total_cost)}</p>
                    </td>
                    <td className={`${tableCellClass} text-end`}>
                      <span className={`font-medium ${profitColor(product.net_profit)}`}>
                        {fmt(product.net_profit)}
                      </span>
                    </td>
                    <td className={`${tableCellClass} text-end`}>
                      <span className={`font-medium ${roiColor(product.roi)}`}>
                        {fmtPct(product.roi)}
                      </span>
                    </td>
                    <td className={`${tableCellClass} text-center`}>
                      <span className="font-display font-medium text-foreground">
                        {product.stock_available ?? 0}
                      </span>
                    </td>
                    <td className={`${tableCellClass} text-center`}>
                      <StatusBadge status={product.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

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
      </div>
    </div>
  );
}
