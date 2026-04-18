"use client";

import { useEffect, useState } from "react";
import {
  Package,
  Search,
  AlertTriangle,
  TrendingDown,
  Archive,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProductWithInventory } from "@/types";
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

const stockVariant = (status: string): "success" | "warning" | "danger" | "info" | "neutral" => {
  switch (status) {
    case "low_stock": return "warning";
    case "out_of_stock": return "danger";
    case "overstock": return "info";
    default: return "success";
  }
};

const stockLabel = (status: string) => (status || "normal").replace("_", " ");

export default function InventoryPage() {
  const [inventory, setInventory] = useState<ProductWithInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch("/api/inventory?" + params.toString());
      const json = await res.json();
      setInventory(json.data || []);
    } catch (err) {
      console.error("Error fetching inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInventory();
  };

  const totalUnits = inventory.reduce(
    (sum, p) => sum + (p.stock_available || 0) + (p.stock_inbound || 0) + (p.stock_warehouse || 0),
    0
  );
  const lowStockCount = inventory.filter((p) => p.stock_status === "low_stock").length;
  const outOfStockCount = inventory.filter((p) => p.stock_status === "out_of_stock").length;
  const overstockCount = inventory.filter((p) => p.stock_status === "overstock").length;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge="INVENTARIO"
        title="Inventario"
        subtitle="Control de stock de tus productos"
      >
        <ExportButton type="inventory" />
        <button
          onClick={fetchInventory}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
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
          trendValue={lowStockCount > 0 ? "Requiere atención" : "OK"}
        />
        <KpiCard
          label="Sin Stock"
          value={String(outOfStockCount)}
          icon={TrendingDown}
          accentColor="red"
          animationDelay={150}
          trend={outOfStockCount > 0 ? "down" : "neutral"}
          trendValue={outOfStockCount > 0 ? "Crítico" : "OK"}
        />
        <KpiCard
          label="Exceso Stock"
          value={String(overstockCount)}
          icon={Archive}
          accentColor="purple"
          animationDelay={225}
        />
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por SKU o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50 border-border"
          />
        </div>
        <button
          type="submit"
          className="px-3 py-2 rounded-xl bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Search className="h-4 w-4" />
        </button>
      </form>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Cargando inventario...</span>
          </div>
        </div>
      )}

      {!loading && inventory.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground/70 mb-1">No hay datos de inventario</h3>
          <p className="text-sm text-muted-foreground">Agrega productos para ver su stock aquí</p>
        </div>
      )}

      {!loading && inventory.length > 0 && (
        <DataTableWrapper
          title={`${inventory.length} producto${inventory.length !== 1 ? "s" : ""}`}
        >
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className={tableHeaderClass}>SKU</th>
                  <th className={tableHeaderClass}>Producto</th>
                  <th className={`${tableHeaderClass} text-center`}>Disponible</th>
                  <th className={`${tableHeaderClass} text-center`}>En Tránsito</th>
                  <th className={`${tableHeaderClass} text-center`}>Warehouse</th>
                  <th className={`${tableHeaderClass} text-center`}>Total</th>
                  <th className={`${tableHeaderClass} text-center`}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((p) => {
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
            {inventory.map((p) => {
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
                      <p className="text-[10px] text-muted-foreground">Tránsito</p>
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