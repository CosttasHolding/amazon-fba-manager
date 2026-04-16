"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmt, fmtPct, roiColor, profitColor } from "@/lib/utils";
import { Search, Plus, Filter, Package, TrendingUp, DollarSign, BarChart3, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTableWrapper, tableHeaderClass, tableRowClass, tableCellClass } from "@/components/ui/data-table-wrapper";
import { PaginationControl } from "@/components/ui/pagination-control";
import { ProductFormModal } from "@/components/product-form-modal";

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "active", label: "Activo" },
  { value: "paused", label: "Pausado" },
  { value: "out_of_stock", label: "Sin stock" },
];

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const fetchProducts = () => {
    setLoading(true);
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => {
        const data = d.data || [];
        setProducts(data);
        const cats = [...new Set(data.map((p: any) => p.category).filter(Boolean))] as string[];
        setCategories(cats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Cerrar filtros al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };
    if (showFilters) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters]);

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.asin?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || p.status === filterStatus;
    const matchCategory = !filterCategory || p.category === filterCategory;
    return matchSearch && matchStatus && matchCategory;
  });

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

  const activeFiltersCount = [filterStatus, filterCategory].filter(Boolean).length;

  const clearFilters = () => {
    setFilterStatus("");
    setFilterCategory("");
    setCurrentPage(1);
  };

  return (
    <div>
      <PageHeader
        badge="INVENTARIO"
        title="Catálogo de Productos"
        subtitle={`${products.length} producto${products.length !== 1 ? "s" : ""} registrado${products.length !== 1 ? "s" : ""}`}
      >
        {/* Contenedor relativo para el dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${showFilters || activeFiltersCount > 0
                ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                : "bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10"
              }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-400">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Dropdown flotante de filtros */}
          {showFilters && (
            <div className="absolute right-0 top-full mt-2 z-50 w-[420px] rounded-2xl border border-white/[0.08] bg-[#0d1117] shadow-2xl shadow-black/40 p-5 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Filtros</h3>
                </div>
                <div className="flex items-center gap-2">
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
                    >
                      <X className="h-3 w-3" />
                      Limpiar
                    </button>
                  )}
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Estado</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                    className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3 py-2.5 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#0a0e1a]">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Categoría</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                    className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3 py-2.5 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all"
                  >
                    <option value="" className="bg-[#0a0e1a]">Todas las categorías</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#0a0e1a]">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                  <span className="text-xs text-white/30">Activos:</span>
                  {filterStatus && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-400">
                      {STATUS_OPTIONS.find((o) => o.value === filterStatus)?.label}
                      <button onClick={() => setFilterStatus("")} className="hover:text-white transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {filterCategory && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-400">
                      {filterCategory}
                      <button onClick={() => setFilterCategory("")} className="hover:text-white transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-cyan-500 hover:bg-cyan-600 text-white transition-all duration-200"
          onClick={() => setShowNewModal(true)}
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </button>
      </PageHeader>

      <ProductFormModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onSuccess={fetchProducts}
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
          placeholder="Buscar por nombre, SKU o ASIN..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-9 bg-white/[0.04] border-white/[0.08]"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-white/40">Cargando productos...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="lg:hidden space-y-3">
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-white/40">
                {search || activeFiltersCount > 0 ? "Sin resultados" : "No hay productos"}
              </p>
            ) : (
              paginated.map((product) => (
                <div
                  key={product.id}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 cursor-pointer active:scale-[0.98] transition-all hover:border-white/[0.1]"
                  onClick={() => router.push(`/products/${product.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm text-white">{product.name}</p>
                      <p className="text-xs text-white/40 font-display">{product.sku}</p>
                    </div>
                    <StatusBadge status={product.status} size="sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div>
                      <p className="font-display uppercase text-[10px] tracking-wider text-white/40">Precio</p>
                      <p className="text-sm font-medium text-white">{fmt(product.sale_price)}</p>
                    </div>
                    <div>
                      <p className="font-display uppercase text-[10px] tracking-wider text-white/40">Ganancia</p>
                      <p className={`text-sm font-medium ${profitColor(product.net_profit)}`}>
                        {fmt(product.net_profit)}
                      </p>
                    </div>
                    <div>
                      <p className="font-display uppercase text-[10px] tracking-wider text-white/40">ROI</p>
                      <p className={`text-sm font-medium ${roiColor(product.roi)}`}>
                        {fmtPct(product.roi)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden lg:block">
            <DataTableWrapper>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <p className="text-white/40">
                    {search || activeFiltersCount > 0 ? "Sin resultados" : "No hay productos aún"}
                  </p>
                  {!search && activeFiltersCount === 0 && (
                    <button
                      onClick={() => setShowNewModal(true)}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white/50 hover:text-white/80 transition-all"
                    >
                      Crear primero
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className={tableHeaderClass}>Producto</th>
                      <th className={tableHeaderClass}>Categoría</th>
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
                            <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                              <Package className="w-4 h-4 text-white/30" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-white">{product.name}</p>
                              <p className="text-xs text-white/40 font-display">{product.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`${tableCellClass} text-white/40`}>
                          {product.category || "—"}
                        </td>
                        <td className={`${tableCellClass} text-right`}>
                          <p className="text-sm font-medium text-white">{fmt(product.sale_price)}</p>
                          <p className="text-xs text-white/40">{fmt(product.total_cost)}</p>
                        </td>
                        <td className={`${tableCellClass} text-right`}>
                          <span className={`font-medium ${profitColor(product.net_profit)}`}>
                            {fmt(product.net_profit)}
                          </span>
                        </td>
                        <td className={`${tableCellClass} text-right`}>
                          <StatusBadge
                            status={fmtPct(product.roi)}
                            variant="info"
                            size="sm"
                          />
                        </td>
                        <td className={`${tableCellClass} text-center`}>
                          <span className="font-display font-medium text-white">
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
        </>
      )}
    </div>
  );
}