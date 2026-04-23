"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { fmt, fmtPct, roiColor, profitColor } from "@/lib/utils";
import { Search, Plus, Package, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
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
import { useProducts } from "@/hooks/use-data";
import { ProductWithInventory } from "@/types";

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "active", label: "Activo" },
  { value: "paused", label: "Pausado" },
  { value: "out_of_stock", label: "Sin stock" },
];

const MARKETPLACE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "US", label: "US" },
  { value: "MX", label: "MX" },
  { value: "CA", label: "CA" },
  { value: "UK", label: "UK" },
  { value: "DE", label: "DE" },
  { value: "FR", label: "FR" },
  { value: "IT", label: "IT" },
  { value: "ES", label: "ES" },
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
  const { products, isLoading, mutate } = useProducts();
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

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p: ProductWithInventory) => p.category).filter(Boolean))] as string[];
    return cats.sort();
  }, [products]);

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
        ...categories.map((c) => ({ value: c, label: c })),
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
  ], [categories]);

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

  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      const matchSearch =
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase()) ||
        p.asin?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filterValues.status || p.status === filterValues.status;
      const matchCategory = !filterValues.category || p.category === filterValues.category;
      const matchMarketplace = !filterValues.marketplace || p.marketplace === filterValues.marketplace;

      const price = p.sale_price || 0;
      const matchPriceMin = filterValues.priceMin === "" || price >= parseFloat(filterValues.priceMin);
      const matchPriceMax = filterValues.priceMax === "" || price <= parseFloat(filterValues.priceMax);

      const roi = p.roi || 0;
      const matchRoiMin = filterValues.roiMin === "" || roi >= parseFloat(filterValues.roiMin);
      const matchRoiMax = filterValues.roiMax === "" || roi <= parseFloat(filterValues.roiMax);

      return matchSearch && matchStatus && matchCategory && matchMarketplace && matchPriceMin && matchPriceMax && matchRoiMin && matchRoiMax;
    });

    result.sort((a, b) => {
      switch (sortValue) {
        case "newest": return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case "oldest": return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "name_asc": return (a.name || "").localeCompare(b.name || "");
        case "name_desc": return (b.name || "").localeCompare(a.name || "");
        case "price_asc": return (a.sale_price || 0) - (b.sale_price || 0);
        case "price_desc": return (b.sale_price || 0) - (a.sale_price || 0);
        case "profit_asc": return (a.net_profit || 0) - (b.net_profit || 0);
        case "profit_desc": return (b.net_profit || 0) - (a.net_profit || 0);
        case "roi_asc": return (a.roi || 0) - (b.roi || 0);
        case "roi_desc": return (b.roi || 0) - (a.roi || 0);
        case "stock_asc": return (a.stock_available || 0) - (b.stock_available || 0);
        case "stock_desc": return (b.stock_available || 0) - (a.stock_available || 0);
        default: return 0;
      }
    });

    return result;
  }, [products, search, filterValues, sortValue]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const activeCount = products.filter((p) => p.status === "active").length;
  const avgRoi =
    products.length > 0
      ? products.reduce((sum, p) => sum + (p.roi || 0), 0) / products.length
      : 0;
  const totalProfit = products.reduce((sum, p) => sum + (p.net_profit || 0), 0);
  const avgPrice =
    products.length > 0
      ? products.reduce((sum, p) => sum + (p.sale_price || 0), 0) / products.length
      : 0;

  const handleExport = () => {
    exportProductsExcel(filtered);
  };

  if (isLoading) {
    return <PageSkeleton kpiCount={4} rowCount={8} showSearch />;
  }

  return (
    <div>
      <PageHeader
        badge="INVENTARIO"
        title="Catalogo de Productos"
        subtitle={`${products.length} producto${products.length !== 1 ? "s" : ""} registrado${products.length !== 1 ? "s" : ""}`}
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
          value={String(products.length)}
          subtitle={`${activeCount} activos`}
          icon={Package}
          accentColor="cyan"
          animationDelay={0}
        />
        <KpiCard
          label="ROI Promedio"
          value={fmtPct(avgRoi)}
          icon={TrendingUp}
          accentColor="green"
          trend={avgRoi >= 20 ? "up" : avgRoi > 0 ? "neutral" : "down"}
          trendValue={avgRoi >= 20 ? "Saludable" : "Revisar"}
          animationDelay={75}
        />
        <KpiCard
          label="Ganancia Total"
          value={fmt(totalProfit)}
          icon={DollarSign}
          accentColor="green"
          animationDelay={150}
        />
        <KpiCard
          label="Precio Promedio"
          value={fmt(avgPrice)}
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
        {filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={search || Object.values(filterValues).some(Boolean) ? "Sin resultados" : "No hay productos"}
            subtitle={search || Object.values(filterValues).some(Boolean) ? "Intenta con otros filtros" : "Agrega tu primer producto para empezar"}
            action={!search && !Object.values(filterValues).some(Boolean) ? { label: "Crear producto", onClick: () => setShowNewModal(true) } : undefined}
          />
        ) : (
          paginated.map((product) => (
            <div
              key={product.id}
              className="rounded-2xl border border-border bg-card p-4 cursor-pointer active:scale-[0.98] transition-all hover:border-border/80"
              onClick={() => router.push(`/products/${product.id}`)}
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
          {filtered.length === 0 ? (
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
                {paginated.map((product) => (
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
                      {product.category || "\u2014"}
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

      {filtered.length > ITEMS_PER_PAGE && (
        <PaginationControl
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}