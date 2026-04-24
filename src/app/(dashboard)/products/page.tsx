"use client";

import { useState, useMemo } from "react";
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
import { ProductWithInventory } from "@/types";
import { MARKETPLACES, DEFAULT_PAGE_SIZE } from "@/lib/constants";

const ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE;

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "active", label: "Activo" },
  { value: "paused", label: "Pausado" },
  { value: "out_of_stock", label: "Sin stock" },
];

const MARKETPLACE_OPTIONS = [
  { value: "", label: "Todos" },
  ...MARKETPLACES.map((m) => ({ value: m.value, label: m.label })),
];

const SORT_OPTIONS = [
  { value: "newest", label: "Mas recientes primero" },
  { value: "oldest", label: "Mas antiguos primero" },
  { value: "name_asc", label: "Nombre A-Z" },
  { value: "name_desc", label: "Nombre Z-A" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
  { value: "profit_asc", label: "Ganancia: menor a mayor" },
  { value: "profit_desc", label: "Ganancia: mayor a menor" },
  { value: "roi_asc", label: "ROI: menor a mayor" },
  { value: "roi_desc", label: "ROI: mayor a menor" },
  { value: "stock_asc", label: "Stock: menor a mayor" },
  { value: "stock_desc", label: "Stock: mayor a menor" },
];

export default function ProductsPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewModal, setShowNewModal] = useState(false);
  const [sortValue, setSortValue] = useState("newest");

  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    status: "",
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

  const filterConfig: FilterConfig[] = useMemo(() => [
    {
      type: "select",
      key: "status",
      label: "Estado",
      options: STATUS_OPTIONS,
      color: "primary",
    },
    {
      type: "select",
      key: "category",
      label: "Categoria",
      options: [
        { value: "", label: "Todas las categorias" },
        ...(summary.categories || []).map((c: string) => ({ value: c, label: c })),
      ],
      color: "purple",
    },
    {
      type: "select",
      key: "marketplace",
      label: "Marketplace",
      options: MARKETPLACE_OPTIONS,
      color: "green",
    },
    {
      type: "range",
      key: "price",
      label: "Precio de venta",
      prefix: "$",
      step: 0.01,
    },
    {
      type: "range",
      key: "roi",
      label: "ROI",
      suffix: "%",
      step: 1,
    },
  ], [summary.categories]);

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilterValues({
      status: "",
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
    exportProductsExcel(exportQuery.products);
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
          <p className="text-lg font-semibold text-foreground mb-1">Error al cargar datos</p>
          <p className="text-sm text-muted-foreground mb-4">No se pudieron obtener los productos. Intenta de nuevo.</p>
        </div>
        <button
          onClick={() => mutate()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        badge="INVENTARIO"
        title="Catalogo de Productos"
        subtitle={`${summary.totalCount} producto${summary.totalCount !== 1 ? "s" : ""} registrado${summary.totalCount !== 1 ? "s" : ""}`}
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
          Nuevo Producto
        </button>
      </PageHeader>

      <ProductFormModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onSuccess={() => mutate()}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Productos"
          value={String(summary.totalCount)}
          subtitle={`${summary.activeCount} activos`}
          icon={Package}
          accentColor="cyan"
          animationDelay={0}
        />
        <KpiCard
          label="ROI Promedio"
          value={fmtPct(summary.avgRoi)}
          icon={TrendingUp}
          accentColor="green"
          trend={summary.avgRoi >= 20 ? "up" : summary.avgRoi > 0 ? "neutral" : "down"}
          trendValue={summary.avgRoi >= 20 ? "Saludable" : "Revisar"}
          animationDelay={75}
        />
        <KpiCard
          label="Ganancia Total"
          value={fmt(summary.totalProfit)}
          icon={DollarSign}
          accentColor="green"
          animationDelay={150}
        />
        <KpiCard
          label="Precio Promedio"
          value={fmt(summary.avgPrice)}
          icon={BarChart3}
          accentColor="purple"
          animationDelay={225}
        />
      </div>

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          aria-label="Buscar productos"
          placeholder="Buscar por nombre, SKU o ASIN..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-9 bg-muted/50 border-border"
        />
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={search || Object.values(filterValues).some(Boolean) ? "Sin resultados" : "No hay productos"}
            subtitle={search || Object.values(filterValues).some(Boolean) ? "Intenta con otros filtros" : "Agrega tu primer producto para empezar"}
            action={!search && !Object.values(filterValues).some(Boolean) ? { label: "Crear producto", onClick: () => setShowNewModal(true) } : undefined}
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
                  <p className="font-display uppercase text-[10px] tracking-wider text-muted-foreground">Precio</p>
                  <p className="text-sm font-medium text-foreground">{fmt(product.sale_price)}</p>
                </div>
                <div>
                  <p className="font-display uppercase text-[10px] tracking-wider text-muted-foreground">Ganancia</p>
                  <p className={`text-sm font-medium ${profitColor(product.net_profit)}`}>
                    {fmt(product.net_profit)}
                  </p>
                </div>
                <div>
                  <p className="font-display uppercase text-[10px] tracking-wider text-muted-foreground">ROI</p>
                  <p className={`text-sm font-medium ${roiColor(product.roi)}`}>
                    {fmtPct(product.roi)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        <DataTableWrapper>
          {products.length === 0 ? (
            <EmptyState
              icon={Package}
              title={search || Object.values(filterValues).some(Boolean) ? "Sin resultados" : "No hay productos"}
              subtitle={search || Object.values(filterValues).some(Boolean) ? "Intenta con otros filtros" : "Agrega tu primer producto para empezar"}
              action={!search && !Object.values(filterValues).some(Boolean) ? { label: "Crear producto", onClick: () => setShowNewModal(true) } : undefined}
            />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className={tableHeaderClass}>Producto</th>
                  <th className={tableHeaderClass}>Categoria</th>
                  <th className={`${tableHeaderClass} text-right`}>Precio / Costo</th>
                  <th className={`${tableHeaderClass} text-right`}>Ganancia</th>
                  <th className={`${tableHeaderClass} text-right`}>ROI</th>
                  <th className={`${tableHeaderClass} text-center`}>Stock</th>
                  <th className={`${tableHeaderClass} text-center`}>Estado</th>
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
                    <td className={`${tableCellClass} text-right`}>
                      <p className="text-sm font-medium text-foreground">{fmt(product.sale_price)}</p>
                      <p className="text-xs text-muted-foreground">{fmt(product.total_cost)}</p>
                    </td>
                    <td className={`${tableCellClass} text-right`}>
                      <span className={`font-medium ${profitColor(product.net_profit)}`}>
                        {fmt(product.net_profit)}
                      </span>
                    </td>
                    <td className={`${tableCellClass} text-right`}>
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
        </DataTableWrapper>
      </div>

      {pagination.total > ITEMS_PER_PAGE && (
        <PaginationControl
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
