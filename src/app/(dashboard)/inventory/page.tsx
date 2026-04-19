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
import { exportInventoryExcel } from "@/lib/export";
import { useInventory } from "@/hooks/use-data";

const stockVariant = (status: string): "success" | "warning" | "danger" | "info" | "neutral" => {
  switch (status) {
    case "low_stock": return "warning";
    case "out_of_stock": return "danger";
    case "overstock": return "info";
    default: return "success";
  }
};

const stockLabel = (status: string) => (status || "normal").replace("_", " ");

const STOCK_STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "normal", label: "Normal" },
  { value: "low_stock", label: "Stock Bajo" },
  { value: "out_of_stock", label: "Sin Stock" },
  { value: "overstock", label: "Sobrestock" },
];

const SORT_OPTIONS = [
  { value: "name_asc", label: "Nombre A-Z" },
  { value: "name_desc", label: "Nombre Z-A" },
  { value: "stock_asc", label: "Stock: menor a mayor" },
  { value: "stock_desc", label: "Stock: mayor a menor" },
  { value: "available_asc", label: "Disponible: menor a mayor" },
  { value: "available_desc", label: "Disponible: mayor a menor" },
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

export default function InventoryPage() {
  const { inventory, isLoading, mutate } = useInventory();
  const [search, setSearch] = useState("");
  const [sortValue, setSortValue] = useState("name_asc");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    stockStatus: "",
    availableMin: "",
    availableMax: "",
  });

  const handleFilterChange = (key: string, value: any) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilterValues({
      stockStatus: "",
      availableMin: "",
      availableMax: "",
    });
  };

  const filtered = useMemo(() => {
    let result = inventory.filter((p: any) => {
      const matchSearch =
        !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase());

      const matchStockStatus =
        !filterValues.stockStatus ||
        (p.stock_status || "normal") === filterValues.stockStatus;

      const available = p.stock_available || 0;
      const matchAvailableMin =
        filterValues.availableMin === "" || available >= parseFloat(filterValues.availableMin);
      const matchAvailableMax =
        filterValues.availableMax === "" || available <= parseFloat(filterValues.availableMax);

      return matchSearch && matchStockStatus && matchAvailableMin && matchAvailableMax;
    });

    result.sort((a: any, b: any) => {
      const totalA = (a.stock_available || 0) + (a.stock_inbound || 0) + (a.stock_warehouse || 0);
      const totalB = (b.stock_available || 0) + (b.stock_inbound || 0) + (b.stock_warehouse || 0);
      switch (sortValue) {
        case "name_asc": return (a.name || "").localeCompare(b.name || "");
        case "name_desc": return (b.name || "").localeCompare(a.name || "");
        case "stock_asc": return totalA - totalB;
        case "stock_desc": return totalB - totalA;
        case "available_asc": return (a.stock_available || 0) - (b.stock_available || 0);
        case "available_desc": return (b.stock_available || 0) - (a.stock_available || 0);
        default: return 0;
      }
    });

    return result;
  }, [inventory, search, filterValues, sortValue]);

  const totalUnits = inventory.reduce(
    (sum: number, p: any) => sum + (p.stock_available || 0) + (p.stock_inbound || 0) + (p.stock_warehouse || 0),
    0
  );
  const lowStockCount = inventory.filter((p: any) => p.stock_status === "low_stock").length;
  const outOfStockCount = inventory.filter((p: any) => p.stock_status === "out_of_stock").length;
  const overstockCount = inventory.filter((p: any) => p.stock_status === "overstock").length;

  const handleExport = () => {
    exportInventoryExcel(filtered);
  };

  if (isLoading) {
    return <PageSkeleton kpiCount={4} rowCount={6} showSearch />;
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
          value={String(totalUnits)}
          icon={Package}
          accentColor="cyan"
          animationDelay={0}
        />
        <KpiCard
          label="Stock Bajo"
          value={String(lowStockCount)}
          icon={AlertTriangle}
          accentColor="amber"
          animationDelay={75}
          trend={lowStockCount > 0 ? "down" : "neutral"}
          trendValue={lowStockCount > 0 ? "Requiere atencion" : "OK"}
        />
        <KpiCard
          label="Sin Stock"
          value={String(outOfStockCount)}
          icon={TrendingDown}
          accentColor="red"
          animationDelay={150}
          trend={outOfStockCount > 0 ? "down" : "neutral"}
          trendValue={outOfStockCount > 0 ? "Critico" : "OK"}
        />
        <KpiCard
          label="Exceso Stock"
          value={String(overstockCount)}
          icon={Archive}
          accentColor="purple"
          animationDelay={225}
        />
      </div>

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por SKU o nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-muted/50 border-border"
        />
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground/70 mb-1">
            {Object.values(filterValues).some(Boolean) ? "Sin resultados" : "No hay datos de inventario"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {Object.values(filterValues).some(Boolean) ? "Intenta con otros filtros" : "Agrega productos para ver su stock aqui"}
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <DataTableWrapper
          title={`${filtered.length} producto${filtered.length !== 1 ? "s" : ""}`}
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
                  <th className={`${tableHeaderClass} text-center`}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => {
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
            {filtered.map((p: any) => {
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
                </div>
              );
            })}
          </div>
        </DataTableWrapper>
      )}
    </div>
  );
}