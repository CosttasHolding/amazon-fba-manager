"use client";

import { useState, useMemo } from "react";
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
import { ProductWithInventory } from "@/types";
import { STOCK_STATUS_OPTIONS, DEFAULT_PAGE_SIZE } from "@/lib/constants";

const stockVariant = (status: string): "success" | "warning" | "danger" | "info" | "neutral" => {
  switch (status) {
    case "low_stock": return "warning";
    case "out_of_stock": return "danger";
    case "overstock": return "info";
    default: return "success";
  }
};

const stockLabel = (status: string) => (status || "normal").replace("_", " ");

const SORT_OPTIONS = [
  { value: "name_asc", label: "Nombre A-Z" },
  { value: "name_desc", label: "Nombre Z-A" },
  { value: "stock_asc", label: "Stock: menor a mayor" },
  { value: "stock_desc", label: "Stock: mayor a menor" },
  { value: "available_asc", label: "Disponible: menor a mayor" },
  { value: "available_desc", label: "Disponible: mayor a menor" },
  { value: "days_asc", label: "Dias stock: menor a mayor" },
  { value: "days_desc", label: "Dias stock: mayor a menor" },
];

const FILTER_CONFIG: FilterConfig[] = [
  {
    type: "select",
    key: "stockStatus",
    label: "Estado de stock",
    options: STOCK_STATUS_OPTIONS,
    color: "amber",
  },
  {
    type: "range",
    key: "available",
    label: "Unidades disponibles",
    step: 1,
  },
];

function StockProjection({ p }: { p: ProductWithInventory }) {
  const days = p.days_of_stock;
  if (days === null || days === undefined) return <span className="text-xs text-muted-foreground">—</span>;
  if (days <= 0) return <span className="text-xs text-red-600 dark:text-rose-400 font-semibold">Sin stock</span>;
  if (days <= 14) return <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">{days}d (critico)</span>;
  if (days <= 30) return <span className="text-xs text-amber-300">{days}d (bajo)</span>;
  return <span className="text-xs text-green-600 dark:text-emerald-400">{days}d</span>;
}

function StockoutDate({ p }: { p: ProductWithInventory }) {
  const days = p.days_of_stock;
  if (!days || days <= 0) return <span className="text-xs text-muted-foreground">—</span>;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return <span className="text-xs text-muted-foreground">{date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}</span>;
}

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [sortValue, setSortValue] = useState("name_asc");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    stockStatus: "",
    availableMin: "",
    availableMax: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE;

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
    exportInventoryExcel(exportQuery.inventory);
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
          <p className="text-lg font-semibold text-foreground mb-1">Error al cargar datos</p>
          <p className="text-sm text-muted-foreground mb-4">No se pudo obtener el inventario. Intenta de nuevo.</p>
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
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge="INVENTARIO"
        title="Inventario"
        subtitle="Control de stock de tus productos"
      >
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
        <button
          onClick={() => mutate()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Unidades"
          value={String(summary.totalUnits)}
          icon={Package}
          accentColor="cyan"
          animationDelay={0}
        />
        <KpiCard
          label="Stock Bajo"
          value={String(summary.lowStockCount)}
          icon={AlertTriangle}
          accentColor="amber"
          animationDelay={75}
          trend={summary.lowStockCount > 0 ? "down" : "neutral"}
          trendValue={summary.lowStockCount > 0 ? "Requiere atencion" : "OK"}
        />
        <KpiCard
          label="Sin Stock"
          value={String(summary.outOfStockCount)}
          icon={TrendingDown}
          accentColor="red"
          animationDelay={150}
          trend={summary.outOfStockCount > 0 ? "down" : "neutral"}
          trendValue={summary.outOfStockCount > 0 ? "Critico" : "OK"}
        />
        <KpiCard
          label="Exceso Stock"
          value={String(summary.overstockCount)}
          icon={Archive}
          accentColor="purple"
          animationDelay={225}
        />
      </div>

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Buscar inventario"
          placeholder="Buscar por SKU o nombre..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-9 bg-muted/50 border-border"
        />
      </div>

      {inventory.length === 0 && (
        <EmptyState
          icon={Package}
          title={Object.values(filterValues).some(Boolean) ? "Sin resultados" : "No hay datos de inventario"}
          subtitle={Object.values(filterValues).some(Boolean) ? "Intenta con otros filtros" : "Agrega productos para ver su stock aqu\u00ED"}
        />
      )}

      {inventory.length > 0 && (
        <DataTableWrapper
          title={`${pagination.total} producto${pagination.total !== 1 ? "s" : ""}`}
        >
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className={tableHeaderClass}>SKU</th>
                  <th className={tableHeaderClass}>Producto</th>
                  <th className={`${tableHeaderClass} text-center`}>Disponible</th>
                  <th className={`${tableHeaderClass} text-center`}>En Transito</th>
                  <th className={`${tableHeaderClass} text-center`}>Warehouse</th>
                  <th className={`${tableHeaderClass} text-center`}>Total</th>
                  <th className={`${tableHeaderClass} text-center`}>Dias Stock</th>
                  <th className={`${tableHeaderClass} text-center`}>Stockout</th>
                  <th className={`${tableHeaderClass} text-center`}>Estado</th>
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
                        <StockProjection p={p} />
                      </td>
                      <td className={`${tableCellClass} text-center`}>
                        <StockoutDate p={p} />
                      </td>
                      <td className={`${tableCellClass} text-center`}>
                        <StatusBadge
                          status={stockLabel(p.stock_status || "normal")}
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
                      status={stockLabel(p.stock_status || "normal")}
                      variant={stockVariant(p.stock_status || "normal")}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Disponible</p>
                      <p className="font-bold text-sm text-foreground/70 tabular-nums">{p.stock_available || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Transito</p>
                      <p className="font-bold text-sm text-foreground/70 tabular-nums">{p.stock_inbound || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Warehouse</p>
                      <p className="font-bold text-sm text-foreground/70 tabular-nums">{p.stock_warehouse || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Total</p>
                      <p className="font-bold text-sm text-primary tabular-nums">{total}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <StockProjection p={p} />
                    <StockoutDate p={p} />
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
