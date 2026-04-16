"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  Factory,
  Globe,
  Star,
  Clock,
  Package,
  ExternalLink,
  Filter,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const renderStars = (rating: number | null) => {
  if (!rating) return <span className="text-white/25 text-xs">Sin rating</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= rating ? "fill-amber-400 text-amber-400" : "text-white/10"
          }`}
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
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
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

  const filtered = suppliers.filter((s) => {
    const matchSearch =
      search === "" ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contact_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (s.country?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchStatus =
      statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = suppliers.filter((s) => s.status === "active").length;
  const countries = [...new Set(suppliers.map((s) => s.country).filter(Boolean))];
  const avgRating =
    suppliers.filter((s) => s.rating).length > 0
      ? (
          suppliers.filter((s) => s.rating).reduce((sum, s) => sum + (s.rating || 0), 0) /
          suppliers.filter((s) => s.rating).length
        ).toFixed(1)
      : "N/A";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          <span className="text-sm text-white/40">Cargando proveedores...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <PageHeader
        badge="PROVEEDORES"
        title="Proveedores"
        subtitle="Gestiona tus proveedores de Alibaba, 1688 y mas"
      >
        <Link
          href="/suppliers/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo Proveedor
        </Link>
      </PageHeader>

      {/* KPIs */}
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
          label="Paises"
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Buscar proveedor, contacto, pais..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/[0.04] border-white/[0.08]"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px] bg-white/[0.04] border-white/[0.08]">
            <Filter className="mr-2 h-4 w-4 text-white/30" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
          <Factory className="h-12 w-12 text-white/15 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white/70 mb-1">
            {suppliers.length === 0 ? "No hay proveedores" : "Sin resultados"}
          </h3>
          <p className="text-sm text-white/35 mb-4">
            {suppliers.length === 0
              ? "Agrega tu primer proveedor de Alibaba"
              : "Intenta cambiar los filtros de busqueda"}
          </p>
          {suppliers.length === 0 && (
            <Link
              href="/suppliers/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Agregar Proveedor
            </Link>
          )}
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <DataTableWrapper
          title={`${filtered.length} proveedor${filtered.length !== 1 ? "es" : ""}`}
        >
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className={tableHeaderClass}>Proveedor</th>
                  <th className={tableHeaderClass}>Pais</th>
                  <th className={tableHeaderClass}>Rating</th>
                  <th className={tableHeaderClass}>MOQ</th>
                  <th className={tableHeaderClass}>Lead Time</th>
                  <th className={tableHeaderClass}>Estado</th>
                  <th className={`${tableHeaderClass} text-right`}>Link</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className={`${tableRowClass} cursor-pointer`}
                    onClick={() => router.push(`/suppliers/${supplier.id}`)}
                  >
                    <td className={tableCellClass}>
                      <p className="font-medium text-white/80">{supplier.name}</p>
                      {supplier.contact_name && (
                        <p className="text-xs text-white/30">{supplier.contact_name}</p>
                      )}
                    </td>
                    <td className={`${tableCellClass} text-white/40`}>
                      {supplier.country || "—"}
                    </td>
                    <td className={tableCellClass}>
                      {renderStars(supplier.rating)}
                    </td>
                    <td className={`${tableCellClass} text-white/40 tabular-nums`}>
                      {supplier.min_order_qty ? `${supplier.min_order_qty} uds` : "—"}
                    </td>
                    <td className={`${tableCellClass} text-white/40 tabular-nums`}>
                      {supplier.lead_time_days ? `${supplier.lead_time_days} dias` : "—"}
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
                          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 text-white/30 hover:text-cyan-400" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 p-4">
            {filtered.map((supplier) => (
              <div
                key={supplier.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 cursor-pointer hover:bg-white/[0.04] transition-colors"
                onClick={() => router.push(`/suppliers/${supplier.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-white/80">{supplier.name}</p>
                    {supplier.contact_name && (
                      <p className="text-xs text-white/30">{supplier.contact_name}</p>
                    )}
                  </div>
                  <StatusBadge status={supplier.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-white/40">
                    <Globe className="h-3.5 w-3.5" />
                    {supplier.country || "Sin pais"}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-white/40">
                    <Package className="h-3.5 w-3.5" />
                    MOQ: {supplier.min_order_qty || "—"}
                  </div>
                  <div>{renderStars(supplier.rating)}</div>
                  <div className="flex items-center gap-1.5 text-xs text-white/40">
                    <Clock className="h-3.5 w-3.5" />
                    {supplier.lead_time_days ? `${supplier.lead_time_days}d` : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DataTableWrapper>
      )}
    </div>
  );
}