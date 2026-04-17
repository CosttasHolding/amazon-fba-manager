"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
  Box,
  Users,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Star,
  Percent,
  ShoppingCart,
  Weight,
  Ruler,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DataTableWrapper,
  tableHeaderClass,
  tableCellClass,
  tableRowClass,
} from "@/components/ui/data-table-wrapper";

interface Product {
  id: string;
  name: string;
  asin: string;
  sku: string;
  category: string;
  status: string;
  buy_cost: number;
  sell_price: number;
  fba_fee: number;
  referral_fee: number;
  shipping_cost: number;
  storage_cost: number;
  weight: number;
  dimensions: string;
  notes: string;
  image_url: string;
  current_stock: number;
  min_stock: number;
  roi: number;
  profit: number;
  margin: number;
  created_at: string;
  updated_at: string;
}

interface ProductSupplier {
  id: string;
  unit_cost: number;
  moq: number;
  lead_time_days: number;
  is_primary: boolean;
  notes: string;
  suppliers: {
    id: string;
    name: string;
    contact_name: string;
    email: string;
    phone: string;
    country: string;
    platform: string;
  };
}

const fmt = (v: number) => `$${(v || 0).toFixed(2)}`;

const platformLabels: Record<string, string> = {
  alibaba: "Alibaba",
  "1688": "1688",
  global_sources: "Global Sources",
};

const platformVariants: Record<string, "warning" | "danger" | "info" | "neutral"> = {
  alibaba: "warning",
  "1688": "danger",
  global_sources: "info",
};

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [suppliers, setSuppliers] = useState<ProductSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchProduct();
      fetchSuppliers();
    }
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${params.id}`);
      if (!res.ok) throw new Error("Error al cargar producto");
      const data = await res.json();
      setProduct(data);
    } catch {
      toast.error("Error al cargar el producto");
      router.push("/products");
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`/api/products/${params.id}/suppliers`);
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error("Error loading suppliers:", error);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${params.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar");
      toast.success("Producto eliminado correctamente");
      router.push("/products");
    } catch {
      toast.error("Error al eliminar el producto");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Cargando producto...</span>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-muted-foreground">Producto no encontrado</p>
        <Button variant="outline" onClick={() => router.push("/products")}>
          Volver a productos
        </Button>
      </div>
    );
  }

  const totalCost =
    (product.buy_cost || 0) +
    (product.fba_fee || 0) +
    (product.referral_fee || 0) +
    (product.shipping_cost || 0) +
    (product.storage_cost || 0);

  const stockStatus =
    product.current_stock <= 0
      ? "Sin stock"
      : product.current_stock <= product.min_stock
        ? "Stock bajo"
        : "En stock";

  const stockVariant: "success" | "warning" | "danger" =
    product.current_stock <= 0
      ? "danger"
      : product.current_stock <= product.min_stock
        ? "warning"
        : "success";

  const costBreakdown = [
    { label: "Costo de compra", value: product.buy_cost },
    { label: "Tarifa FBA", value: product.fba_fee },
    { label: "Tarifa referral", value: product.referral_fee },
    { label: "Costo de envío", value: product.shipping_cost },
    { label: "Costo almacenamiento", value: product.storage_cost },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge="PRODUCTO"
        title={product.name}
        subtitle={`ASIN: ${product.asin || "N/A"} — SKU: ${product.sku || "N/A"}${product.category ? ` — ${product.category}` : ""}`}
        breadcrumbs={[
          { label: "Productos", href: "/products" },
          { label: product.name },
        ]}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={product.status} />
          <Link
            href={`/products/${params.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Eliminar
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-popover border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">
                  ¿Eliminar producto?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Esta acción no se puede deshacer. Se eliminará permanentemente
                  el producto &quot;{product.name}&quot; y todos sus datos asociados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-muted/50 border-border text-muted-foreground hover:bg-muted">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20"
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Precio Venta"
          value={fmt(product.sell_price)}
          icon={DollarSign}
          accentColor="green"
          animationDelay={0}
        />
        <KpiCard
          label="Costo Compra"
          value={fmt(product.buy_cost)}
          icon={ShoppingCart}
          accentColor="cyan"
          animationDelay={75}
        />
        <KpiCard
          label="ROI"
          value={`${(product.roi || 0).toFixed(1)}%`}
          icon={TrendingUp}
          accentColor={
            (product.roi || 0) >= 20
              ? "green"
              : (product.roi || 0) >= 0
                ? "amber"
                : "red"
          }
          trend={(product.roi || 0) >= 0 ? "up" : "down"}
          trendValue={
            (product.roi || 0) >= 20
              ? "Excelente"
              : (product.roi || 0) >= 0
                ? "Aceptable"
                : "Negativo"
          }
          animationDelay={150}
        />
        <KpiCard
          label="Margen"
          value={`${(product.margin || 0).toFixed(1)}%`}
          icon={Percent}
          accentColor={(product.margin || 0) >= 0 ? "green" : "red"}
          animationDelay={225}
        />
      </div>

      {/* Banner de ganancia */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-5 ${(product.profit || 0) >= 0
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-red-500/20 bg-red-500/5"
          }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${(product.profit || 0) >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"
                }`}
            >
              <DollarSign
                className={`h-5 w-5 ${(product.profit || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              Ganancia por unidad
            </span>
          </div>
          <span
            className={`text-2xl font-bold tabular-nums ${(product.profit || 0) >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
          >
            {fmt(product.profit)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Desglose de costos */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <DollarSign className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Desglose de Costos
            </h3>
          </div>
          <div className="space-y-3">
            {costBreakdown.map((item) => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium text-foreground tabular-nums">
                  {fmt(item.value)}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">
                Costo total
              </span>
              <span className="text-sm font-bold text-primary tabular-nums">
                {fmt(totalCost)}
              </span>
            </div>
          </div>
        </div>

        {/* Inventario */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Box className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Inventario
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Stock actual</span>
              <span
                className={`text-sm font-bold tabular-nums ${stockVariant === "danger"
                    ? "text-red-400"
                    : stockVariant === "warning"
                      ? "text-yellow-400"
                      : "text-emerald-400"
                  }`}
              >
                {product.current_stock || 0} uds
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Stock mínimo</span>
              <span className="text-sm font-medium text-foreground tabular-nums">
                {product.min_stock || 0} uds
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Estado</span>
              <StatusBadge status={stockStatus} variant={stockVariant} />
            </div>
            {product.weight > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Weight className="h-3 w-3" /> Peso
                </span>
                <span className="text-sm font-medium text-foreground">
                  {product.weight} kg
                </span>
              </div>
            )}
            {product.dimensions && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Ruler className="h-3 w-3" /> Dimensiones
                </span>
                <span className="text-sm font-medium text-foreground">
                  {product.dimensions}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notas */}
      {product.notes && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Notas
            </span>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {product.notes}
          </p>
        </div>
      )}

      {/* Proveedores vinculados */}
      <DataTableWrapper
        title="Proveedores Vinculados"
        actions={
          <Link
            href="/suppliers"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Ver proveedores
            <ExternalLink className="h-3 w-3" />
          </Link>
        }
      >
        {suppliers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              No hay proveedores vinculados
            </p>
            <p className="text-xs text-muted-foreground/60">
              Vincula proveedores desde la página de edición del producto
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className={tableHeaderClass}>Proveedor</th>
                    <th className={tableHeaderClass}>Plataforma</th>
                    <th className={tableHeaderClass}>País</th>
                    <th className={`${tableHeaderClass} text-right`}>Costo unit.</th>
                    <th className={`${tableHeaderClass} text-right`}>MOQ</th>
                    <th className={`${tableHeaderClass} text-right`}>Lead time</th>
                    <th className={`${tableHeaderClass} text-center`}>Principal</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((ps) => (
                    <tr key={ps.id} className={tableRowClass}>
                      <td className={tableCellClass}>
                        <Link
                          href={`/suppliers/${ps.suppliers.id}`}
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {ps.suppliers.name}
                        </Link>
                        {ps.suppliers.contact_name && (
                          <p className="text-xs text-muted-foreground/60">
                            {ps.suppliers.contact_name}
                          </p>
                        )}
                      </td>
                      <td className={tableCellClass}>
                        <StatusBadge
                          status={platformLabels[ps.suppliers.platform] || ps.suppliers.platform}
                          variant={platformVariants[ps.suppliers.platform] || "neutral"}
                        />
                      </td>
                      <td className={`${tableCellClass} text-muted-foreground`}>
                        {ps.suppliers.country || "N/A"}
                      </td>
                      <td className={`${tableCellClass} text-right font-medium text-foreground tabular-nums`}>
                        {fmt(ps.unit_cost)}
                      </td>
                      <td className={`${tableCellClass} text-right text-muted-foreground tabular-nums`}>
                        {ps.moq || "N/A"}
                      </td>
                      <td className={`${tableCellClass} text-right text-muted-foreground tabular-nums`}>
                        {ps.lead_time_days ? `${ps.lead_time_days}d` : "N/A"}
                      </td>
                      <td className={`${tableCellClass} text-center`}>
                        {ps.is_primary && (
                          <Star className="h-4 w-4 text-yellow-500 mx-auto fill-yellow-500" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3 p-4">
              {suppliers.map((ps) => (
                <div
                  key={ps.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/suppliers/${ps.suppliers.id}`}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {ps.suppliers.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      {ps.is_primary && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                      <StatusBadge
                        status={platformLabels[ps.suppliers.platform] || ps.suppliers.platform}
                        variant={platformVariants[ps.suppliers.platform] || "neutral"}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Costo</span>
                      <p className="font-medium text-foreground tabular-nums">
                        {fmt(ps.unit_cost)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">MOQ</span>
                      <p className="font-medium text-foreground">{ps.moq || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lead time</span>
                      <p className="font-medium text-foreground">
                        {ps.lead_time_days ? `${ps.lead_time_days} días` : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DataTableWrapper>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground/60 px-1">
        <span>
          Creado: {new Date(product.created_at).toLocaleDateString("es-ES")}
        </span>
        <span>
          Actualizado: {new Date(product.updated_at).toLocaleDateString("es-ES")}
        </span>
      </div>
    </div>
  );
}