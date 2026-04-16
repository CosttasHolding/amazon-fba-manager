"use client";

import { useEffect, useState } from "react";
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
  MoreHorizontal,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Supplier } from "@/types";

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

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-muted-foreground text-sm">Sin rating</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${
              i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  const statusBadge = (status: string) => (
    <Badge variant={status === "active" ? "default" : "secondary"}
      className={status === "active"
        ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
        : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
      }
    >
      {status === "active" ? "Activo" : "Inactivo"}
    </Badge>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Proveedores</h1>
            <p className="text-sm text-muted-foreground">Cargando...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-16 animate-pulse bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona tus proveedores de Alibaba, 1688 y más
          </p>
        </div>
        <Button onClick={() => router.push("/suppliers/new")}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Proveedor
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Factory className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{suppliers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2">
                <Package className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2">
                <Globe className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Países</p>
                <p className="text-2xl font-bold">{countries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rating Prom.</p>
                <p className="text-2xl font-bold">{avgRating}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar proveedor, contacto, país..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
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
      {filtered.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Factory className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">
              {suppliers.length === 0 ? "No hay proveedores" : "Sin resultados"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {suppliers.length === 0
                ? "Agrega tu primer proveedor de Alibaba"
                : "Intenta cambiar los filtros de búsqueda"}
            </p>
            {suppliers.length === 0 && (
              <Button onClick={() => router.push("/suppliers/new")}>
                <Plus className="mr-2 h-4 w-4" /> Agregar Proveedor
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabla Desktop */}
      {filtered.length > 0 && (
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Proveedor</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">País</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Rating</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">MOQ</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Lead Time</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/suppliers/${supplier.id}`)}
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{supplier.name}</p>
                        {supplier.contact_name && (
                          <p className="text-sm text-muted-foreground">{supplier.contact_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm">{supplier.country || "—"}</td>
                    <td className="p-4">{renderStars(supplier.rating)}</td>
                    <td className="p-4 text-sm">
                      {supplier.min_order_qty ? `${supplier.min_order_qty} uds` : "—"}
                    </td>
                    <td className="p-4 text-sm">
                      {supplier.lead_time_days ? `${supplier.lead_time_days} días` : "—"}
                    </td>
                    <td className="p-4">{statusBadge(supplier.status)}</td>
                    <td className="p-4 text-right">
                      {supplier.alibaba_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(supplier.alibaba_url!, "_blank");
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Cards Mobile */}
      {filtered.length > 0 && (
        <div className="md:hidden space-y-3">
          {filtered.map((supplier) => (
            <Card
              key={supplier.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => router.push(`/suppliers/${supplier.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{supplier.name}</p>
                    {supplier.contact_name && (
                      <p className="text-sm text-muted-foreground">{supplier.contact_name}</p>
                    )}
                  </div>
                  {statusBadge(supplier.status)}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Globe className="h-3.5 w-3.5" />
                    {supplier.country || "Sin país"}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Package className="h-3.5 w-3.5" />
                    MOQ: {supplier.min_order_qty || "—"}
                  </div>
                  <div>{renderStars(supplier.rating)}</div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {supplier.lead_time_days ? `${supplier.lead_time_days}d` : "—"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
