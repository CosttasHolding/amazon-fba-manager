"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Factory,
  Globe,
  Star,
  Clock,
  Package,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Supplier } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DataTableWrapper,
  tableHeaderClass,
  tableCellClass,
  tableRowClass,
} from "@/components/ui/data-table-wrapper";
import { PaginationControl } from "@/components/ui/pagination-control";
import { SupplierFormModal } from "@/components/supplier-form-modal";
import { ExportButton } from "@/components/ui/export-button";
import { FilterPanel, FilterConfig } from "@/components/ui/filter-panel";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Más recientes primero" },
  { value: "oldest", label: "Más antiguos primero" },
  { value: "name_asc", label: "Nombre A-Z" },
  { value: "name_desc", label: "Nombre Z-A" },
  { value: "rating_asc", label: "Rating: menor a mayor" },
  { value: "rating_desc", label: "Rating: mayor a menor" },
  { value: "moq_asc", label: "MOQ: menor a mayor" },
  { value: "moq_desc", label: "MOQ: mayor a menor" },
  { value: "lead_asc", label: "Lead time: menor a mayor" },
  { value: "lead_desc", label: "Lead time: mayor a menor" },
];

const renderStars = (rating: number | null) => {
  if (!rating) return <span className="text-muted-foreground text-xs">Sin rating</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
};

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewModal, setShowNewModal] = useState(false);
  const [sortValue, setSortValue] = useState("newest");

  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    status: "",
    country: "",
    ratingMin: "",
    ratingMax: "",
    moqMin: "",
    moqMax: "",
    leadMin: "",
    leadMax: "",
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  const countries = useMemo(() => {
    const list = [...new Set(suppliers.map((s) => s.country).filter(Boolean))] as string[];
    return list.sort();
  }, [suppliers]);

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
      key: "country",
      label: "País",
      options: [
        { value: "", label: "Todos los Países" },
        ...countries.map((c) => ({ value: c, label: c })),
      ],
      color: "purple",
    },
    {
      type: "range",
      key: "rating",
      label: "Rating",
      min: 1,
      max: 5,
      step: 1,
      suffix: " ★",
    },
    {
      type: "range",
      key: "moq",
      label: "MOQ (cantidad mínima)",
      step: 1,
      suffix: " uds",
    },
    {
      type: "range",
      key: "lead",
      label: "Lead time",
      step: 1,
      suffix: " días",
    },
  ], [countries]);

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilterValues({
      status: "",
      country: "",
      ratingMin: "",
      ratingMax: "",
      moqMin: "",
      moqMax: "",
      leadMin: "",
      leadMax: "",
    });
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    let result = suppliers.filter((s) => {
      const matchSearch =
        search === "" ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.contact_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (s.country?.toLowerCase().includes(search.toLowerCase()) ?? false);

      const matchStatus = !filterValues.status || s.status === filterValues.status;
      const matchCountry = !filterValues.country || s.country === filterValues.country;

      const rating = s.rating || 0;
      const matchRatingMin = filterValues.ratingMin === "" || rating >= parseFloat(filterValues.ratingMin);
      const matchRatingMax = filterValues.ratingMax === "" || rating <= parseFloat(filterValues.ratingMax);

      const moq = s.min_order_qty || 0;
      const matchMoqMin = filterValues.moqMin === "" || moq >= parseFloat(filterValues.moqMin);
      const matchMoqMax = filterValues.moqMax === "" || moq <= parseFloat(filterValues.moqMax);

      const lead = s.lead_time_days || 0;
      const matchLeadMin = filterValues.leadMin === "" || lead >= parseFloat(filterValues.leadMin);
      const matchLeadMax = filterValues.leadMax === "" || lead <= parseFloat(filterValues.leadMax);

      return matchSearch && matchStatus && matchCountry && matchRatingMin && matchRatingMax && matchMoqMin && matchMoqMax && matchLeadMin && matchLeadMax;
    });

    result.sort((a, b) => {
      switch (sortValue) {
        case "newest": return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case "oldest": return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "name_asc": return (a.name || "").localeCompare(b.name || "");
        case "name_desc": return (b.name || "").localeCompare(a.name || "");
        case "rating_asc": return (a.rating || 0) - (b.rating || 0);
        case "rating_desc": return (b.rating || 0) - (a.rating || 0);
        case "moq_asc": return (a.min_order_qty || 0) - (b.min_order_qty || 0);
        case "moq_desc": return (b.min_order_qty || 0) - (a.min_order_qty || 0);
        case "lead_asc": return (a.lead_time_days || 0) - (b.lead_time_days || 0);
        case "lead_desc": return (b.lead_time_days || 0) - (a.lead_time_days || 0);
        default: return 0;
      }
    });

    return result;
  }, [suppliers, search, filterValues, sortValue]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const activeCount = suppliers.filter((s) => s.status === "active").length;
  const avgRating =
    suppliers.filter((s) => s.rating).length > 0
      ? (
        suppliers.filter((s) => s.rating).reduce((sum, s) => sum + (s.rating || 0), 0) /
        suppliers.filter((s) => s.rating).length
      ).toFixed(1)
      : "N/A";

  if (loading) {
    return <PageSkeleton kpiCount={4} rowCount={6} showSearch />;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge="PROVEEDORES"
        title="Proveedores"
        subtitle={`${suppliers.length} proveedor${suppliers.length !== 1 ? "es" : ""} registrado${suppliers.length !== 1 ? "s" : ""}`}
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

        <ExportButton type="suppliers" />

        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo Proveedor
        </button>
      </PageHeader>

      <SupplierFormModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onSuccess={fetchSuppliers}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total"
          value={String(suppliers.length)}
          icon={Factory}
          accentColor="cyan"
          animationDelay={0}
        />
        <KpiCard
          label="Activos"
          value={String(activeCount)}
          icon={Package}
          accentColor="green"
          animationDelay={75}
          progressBar={suppliers.length > 0 ? Math.round((activeCount / suppliers.length) * 100) : 0}
        />
        <KpiCard
          label="Países"
          value={String(countries.length)}
          icon={Globe}
          accentColor="purple"
          animationDelay={150}
        />
        <KpiCard
          label="Rating Prom."
          value={avgRating}
          icon={Star}
          accentColor="amber"
          animationDelay={225}
        />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Buscar proveedores"
          placeholder="Buscar proveedor, contacto, pa\u00EDs..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-9 bg-muted/50 border-border"
        />
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={Factory}
          title={suppliers.length === 0 ? "No hay proveedores" : "Sin resultados"}
          subtitle={suppliers.length === 0 ? "Agrega tu primer proveedor de Alibaba" : "Intenta cambiar los filtros de b\u00FAsqueda"}
          action={suppliers.length === 0 ? { label: "Agregar Proveedor", onClick: () => setShowNewModal(true) } : undefined}
        />
      )}

      {filtered.length > 0 && (
        <>
          <DataTableWrapper
            title={`${filtered.length} proveedor${filtered.length !== 1 ? "es" : ""}`}
          >
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className={tableHeaderClass}>Proveedor</th>
                    <th className={tableHeaderClass}>País</th>
                    <th className={tableHeaderClass}>Rating</th>
                    <th className={tableHeaderClass}>MOQ</th>
                    <th className={tableHeaderClass}>Lead Time</th>
                    <th className={tableHeaderClass}>Estado</th>
                    <th className={`${tableHeaderClass} text-right`}>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className={`${tableRowClass} cursor-pointer`}
                      onClick={() => router.push(`/suppliers/${supplier.id}`)}
                    >
                      <td className={tableCellClass}>
                        <p className="font-medium text-foreground/80">{supplier.name}</p>
                        {supplier.contact_name && (
                          <p className="text-xs text-muted-foreground">{supplier.contact_name}</p>
                        )}
                      </td>
                      <td className={`${tableCellClass} text-muted-foreground`}>
                        {supplier.country || "—"}
                      </td>
                      <td className={tableCellClass}>
                        {renderStars(supplier.rating)}
                      </td>
                      <td className={`${tableCellClass} text-muted-foreground tabular-nums`}>
                        {supplier.min_order_qty ? `${supplier.min_order_qty} uds` : "—"}
                      </td>
                      <td className={`${tableCellClass} text-muted-foreground tabular-nums`}>
                        {supplier.lead_time_days ? `${supplier.lead_time_days} días` : "—"}
                      </td>
                      <td className={tableCellClass}>
                        <StatusBadge status={supplier.status} />
                      </td>
                      <td className={`${tableCellClass} text-right`}>
                        {supplier.alibaba_url && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(supplier.alibaba_url!, "_blank");
                            }}
                            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3 p-4">
              {paginated.map((supplier) => (
                <div
                  key={supplier.id}
                  className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => router.push(`/suppliers/${supplier.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-foreground/80">{supplier.name}</p>
                      {supplier.contact_name && (
                        <p className="text-xs text-muted-foreground">{supplier.contact_name}</p>
                      )}
                    </div>
                    <StatusBadge status={supplier.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Globe className="h-3.5 w-3.5" />
                      {supplier.country || "Sin país"}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Package className="h-3.5 w-3.5" />
                      MOQ: {supplier.min_order_qty || "—"}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {supplier.lead_time_days ? `${supplier.lead_time_days}d` : "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DataTableWrapper>

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