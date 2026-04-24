"use client";

import { useEffect, useState, useRef } from "react";
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
import { KpiSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

interface Product {
  id: string;
  name: string;
  asin: string;
  sku: string;
  category: string;
  status: string;
  buy_cost: number;
  sell_price: number;
  unit_cost: number;
  sale_price: number;
  fba_fee: number;
  referral_fee: number;
  shipping_cost: number;
  storage_cost: number;
  storage_fee_monthly: number;
  weight: number;
  weight_kg: number;
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
    contact_email: string;
    contact_whatsapp: string;
    country: string;
    alibaba_url: string;
    rating: number;
    status: string;
  };
}

const fmtMoney = (v: number) => "$" + (v || 0).toFixed(2);

function RatingStars({ rating }: { rating: number }) {
  if (!rating) return <span className="text-xs text-muted-foreground">N/A</span>;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={"h-3 w-3 " + (i < rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30")}
        />
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="space-y-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-56" />
      </div>
      <KpiSkeleton count={4} />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
      <TableSkeleton rows={3} />
    </div>
  );
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [suppliers, setSuppliers] = useState<ProductSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (params.id) {
      fetchProduct();
      fetchSuppliers();
    }
    return () => {
      mountedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const fetchProduct = async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/products/" + params.id, { signal: controller.signal });
      if (!res.ok) throw new Error("Error al cargar producto");
      const data = await res.json();
      const p = data.data ? data.data : data;
      if (mountedRef.current) setProduct(p);
    } catch {
      if (mountedRef.current) {
        toast.error("Error al cargar el producto");
        router.push("/products");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/products/" + params.id + "/suppliers");
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) setSuppliers(Array.isArray(data) ? data : data.data || []);
      }
    } catch (error) {
      console.error("Error loading suppliers:", error);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/products/" + params.id, {
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
    return <DetailSkeleton />;
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

  const sellPrice = product.sell_price || product.sale_price || 0;
  const buyCost = product.buy_cost || product.unit_cost || 0;
  const fbaFee = product.fba_fee || 0;
  const referralFee = product.referral_fee || 0;
  const shippingCost = product.shipping_cost || 0;
  const storageCost = product.storage_cost || product.storage_fee_monthly || 0;
  const productWeight = product.weight || product.weight_kg || 0;

  const totalCost = buyCost + fbaFee + referralFee + shippingCost + storageCost;
  const profitValue = product.profit ?? (sellPrice - totalCost);
  const roiValue = product.roi ?? (buyCost > 0 ? (profitValue / buyCost) * 100 : 0);
  const marginValue = product.margin ?? (sellPrice > 0 ? (profitValue / sellPrice) * 100 : 0);

  const stockStatus =
    (product.current_stock || 0) <= 0
      ? "Sin stock"
      : (product.current_stock || 0) <= (product.min_stock || 0)
        ? "Stock bajo"
        : "En stock";

  const stockVariant: "success" | "warning" | "danger" =
    (product.current_stock || 0) <= 0
      ? "danger"
      : (product.current_stock || 0) <= (product.min_stock || 0)
        ? "warning"
        : "success";

  const subtitleText = "ASIN: " + (product.asin || "N/A") + " — SKU: " + (product.sku || "N/A") + (product.category ? " — " + product.category : "");

  const costBreakdown = [
    { label: "Costo de compra", value: buyCost },
    { label: "Tarifa FBA", value: fbaFee },
    { label: "Tarifa referral", value: referralFee },
    { label: "Costo de envío", value: shippingCost },
    { label: "Costo almacenamiento", value: storageCost },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge="PRODUCTO"
        title={product.name || "Sin nombre"}
        subtitle={subtitleText}
        breadcrumbs={[
          { label: "Productos", href: "/products" },
          { label: product.name || "Producto" },
        ]}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={product.status} />
          <Link
            href={"/products/" + params.id + "/edit"}
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
                  ¿ Eliminar producto?
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
          value={fmtMoney(sellPrice)}
          icon={DollarSign}
          accentColor="green"
          animationDelay={0}
        />
        <KpiCard
          label="Costo Compra"
          value={fmtMoney(buyCost)}
          icon={ShoppingCart}
          accentColor="cyan"
          animationDelay={75}
        />
        <KpiCard
          label="ROI"
          value={roiValue.toFixed(1) + "%"}
          icon={TrendingUp}
          accentColor={
            roiValue >= 20 ? "green" : roiValue >= 0 ? "amber" : "red"
          }
          trend={roiValue >= 0 ? "up" : "down"}
          trendValue={
            roiValue >= 20
              ? "Excelente"
              : roiValue >= 0
                ? "Aceptable"
                : "Negativo"
          }
          animationDelay={150}
        />
        <KpiCard
          label="Margen"
          value={marginValue.toFixed(1) + "%"}
          icon={Percent}
          accentColor={marginValue >= 0 ? "green" : "red"}
          animationDelay={225}
        />
      </div>

      <div
        className={"relative overflow-hidden rounded-2xl border p-5 " + (
          profitValue >= 0
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-red-500/20 bg-red-500/5"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={"w-10 h-10 rounded-xl flex items-center justify-center " + (
                profitValue >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"
              )}
            >
              <DollarSign
                className={"h-5 w-5 " + (
                  profitValue >= 0 ? "text-emerald-400" : "text-red-400"
                )}
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              Ganancia por unidad
            </span>
          </div>
          <span
            className={"text-2xl font-bold tabular-nums " + (
              profitValue >= 0 ? "text-emerald-400" : "text-red-400"
            )}
          >
            {fmtMoney(profitValue)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  {fmtMoney(item.value)}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">Costo total</span>
              <span className="text-sm font-bold text-primary tabular-nums">{fmtMoney(totalCost)}</span>
            </div>
          </div>
        </div>

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
                className={"text-sm font-bold tabular-nums " + (
                  stockVariant === "danger"
                    ? "text-red-400"
                    : stockVariant === "warning"
                      ? "text-yellow-400"
                      : "text-emerald-400"
                )}
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
            {productWeight > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Weight className="h-3 w-3" /> Peso
                </span>
                <span className="text-sm font-medium text-foreground">
                  {productWeight} kg
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
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className={tableHeaderClass}>Proveedor</th>
                    <th className={tableHeaderClass}>País</th>
                    <th className={tableHeaderClass}>Rating</th>
                    <th className={tableHeaderClass + " text-right"}>Costo unit.</th>
                    <th className={tableHeaderClass + " text-right"}>MOQ</th>
                    <th className={tableHeaderClass + " text-right"}>Lead time</th>
                    <th className={tableHeaderClass + " text-center"}>Principal</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((ps) => (
                    <tr key={ps.id} className={tableRowClass}>
                      <td className={tableCellClass}>
                        <Link
                          href={"/suppliers/" + ps.suppliers.id}
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
                      <td className={tableCellClass + " text-muted-foreground"}>
                        {ps.suppliers.country || "N/A"}
                      </td>
                      <td className={tableCellClass}>
                        <RatingStars rating={ps.suppliers.rating} />
                      </td>
                      <td className={tableCellClass + " text-right font-medium text-foreground tabular-nums"}>
                        {fmtMoney(ps.unit_cost)}
                      </td>
                      <td className={tableCellClass + " text-right text-muted-foreground tabular-nums"}>
                        {ps.moq || "N/A"}
                      </td>
                      <td className={tableCellClass + " text-right text-muted-foreground tabular-nums"}>
                        {ps.lead_time_days ? ps.lead_time_days + "d" : "N/A"}
                      </td>
                      <td className={tableCellClass + " text-center"}>
                        {ps.is_primary && (
                          <Star className="h-4 w-4 text-yellow-500 mx-auto fill-yellow-500" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3 p-4">
              {suppliers.map((ps) => (
                <div
                  key={ps.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={"/suppliers/" + ps.suppliers.id}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {ps.suppliers.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      {ps.is_primary && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                      <RatingStars rating={ps.suppliers.rating} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Costo</span>
                      <p className="font-medium text-foreground tabular-nums">
                        {fmtMoney(ps.unit_cost)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">MOQ</span>
                      <p className="font-medium text-foreground">{ps.moq || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lead time</span>
                      <p className="font-medium text-foreground">
                        {ps.lead_time_days ? ps.lead_time_days + " días" : "N/A"}
                      </p>
                    </div>
                  </div>
                  {ps.suppliers.country && (
                    <p className="text-xs text-muted-foreground">
                      País: {ps.suppliers.country}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DataTableWrapper>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground/60 px-1">
        <span>
          Creado: {product.created_at ? new Date(product.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
        </span>
        <span>
          Actualizado: {product.updated_at ? new Date(product.updated_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
        </span>
      </div>
    </div>
  );
}