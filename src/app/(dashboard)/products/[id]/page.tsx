"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  DollarSign,
  TrendingUp,
  BarChart3,
  Box,
  Users,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Star,
} from "lucide-react";
import { toast } from "sonner";

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
    } catch (error) {
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
    } catch (error) {
      toast.error("Error al eliminar el producto");
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (value: number) => `$${(value || 0).toFixed(2)}`;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-green-500/10 text-green-500 border-green-500/20",
      inactive: "bg-red-500/10 text-red-500 border-red-500/20",
      draft: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    };
    const labels: Record<string, string> = {
      active: "Activo",
      inactive: "Inactivo",
      draft: "Borrador",
    };
    return (
      <Badge variant="outline" className={variants[status] || ""}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getPlatformBadge = (platform: string) => {
    const colors: Record<string, string> = {
      alibaba: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      "1688": "bg-red-500/10 text-red-500 border-red-500/20",
      "global_sources": "bg-blue-500/10 text-blue-500 border-blue-500/20",
      other: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    };
    return (
      <Badge variant="outline" className={colors[platform] || colors.other}>
        {platform === "global_sources" ? "Global Sources" : platform.charAt(0).toUpperCase() + platform.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Producto no encontrado</p>
        <Button variant="outline" onClick={() => router.push("/products")}>
          Volver a productos
        </Button>
      </div>
    );
  }

  const stockColor =
    product.current_stock <= 0
      ? "text-red-500"
      : product.current_stock <= product.min_stock
      ? "text-yellow-500"
      : "text-green-500";

  const stockLabel =
    product.current_stock <= 0
      ? "Sin stock"
      : product.current_stock <= product.min_stock
      ? "Stock bajo"
      : "En stock";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/products")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground truncate">
                {product.name}
              </h1>
              {getStatusBadge(product.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              ASIN: {product.asin || "N/A"} &middot; SKU: {product.sku || "N/A"}
              {product.category && ` \u00B7 ${product.category}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-11 sm:ml-0">
          <Button variant="outline" asChild>
            <Link href={`/products/${params.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                {deleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {"\u00BF"}Eliminar producto?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acci{"\u00F3"}n no se puede deshacer. Se eliminar{"\u00E1"} permanentemente
                  el producto &quot;{product.name}&quot; y todos sus datos asociados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Precio venta</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {formatCurrency(product.sell_price)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Costo</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {formatCurrency(product.buy_cost)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">ROI</span>
            </div>
            <p className={`text-2xl font-bold mt-1 ${(product.roi || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
              {(product.roi || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Margen</span>
            </div>
            <p className={`text-2xl font-bold mt-1 ${(product.margin || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
              {(product.margin || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profit highlight */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Ganancia por unidad
          </span>
          <span className={`text-xl font-bold ${(product.profit || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
            {formatCurrency(product.profit)}
          </span>
        </CardContent>
      </Card>

      {/* Costs Breakdown + Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Desglose de costos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Costo de compra", value: product.buy_cost },
              { label: "Tarifa FBA", value: product.fba_fee },
              { label: "Tarifa referral", value: product.referral_fee },
              { label: "Costo de env\u00EDo", value: product.shipping_cost },
              { label: "Costo almacenamiento", value: product.storage_cost },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium text-foreground">
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Costo total</span>
              <span className="text-sm font-bold text-foreground">
                {formatCurrency(
                  (product.buy_cost || 0) +
                  (product.fba_fee || 0) +
                  (product.referral_fee || 0) +
                  (product.shipping_cost || 0) +
                  (product.storage_cost || 0)
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Box className="h-4 w-4" />
              Inventario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Stock actual</span>
              <span className={`text-sm font-bold ${stockColor}`}>
                {product.current_stock || 0} uds
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Stock m{"\u00ED"}nimo</span>
              <span className="text-sm font-medium text-foreground">
                {product.min_stock || 0} uds
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Estado</span>
              <Badge variant="outline" className={`${stockColor}`}>
                {stockLabel}
              </Badge>
            </div>
            {product.weight > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Peso</span>
                <span className="text-sm font-medium text-foreground">
                  {product.weight} kg
                </span>
              </div>
            )}
            {product.dimensions && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Dimensiones</span>
                <span className="text-sm font-medium text-foreground">
                  {product.dimensions}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {product.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {product.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Suppliers Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Proveedores vinculados
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/suppliers">
                Ver proveedores
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">
                No hay proveedores vinculados
              </p>
              <p className="text-xs text-muted-foreground">
                Vincula proveedores desde la p{"\u00E1"}gina de edici{"\u00F3"}n del producto
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-xs font-medium text-muted-foreground">
                        Proveedor
                      </th>
                      <th className="text-left py-2 text-xs font-medium text-muted-foreground">
                        Plataforma
                      </th>
                      <th className="text-left py-2 text-xs font-medium text-muted-foreground">
                        Pa{"\u00ED"}s
                      </th>
                      <th className="text-right py-2 text-xs font-medium text-muted-foreground">
                        Costo unit.
                      </th>
                      <th className="text-right py-2 text-xs font-medium text-muted-foreground">
                        MOQ
                      </th>
                      <th className="text-right py-2 text-xs font-medium text-muted-foreground">
                        Lead time
                      </th>
                      <th className="text-center py-2 text-xs font-medium text-muted-foreground">
                        Principal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((ps) => (
                      <tr
                        key={ps.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="py-3">
                          <Link
                            href={`/suppliers/${ps.suppliers.id}`}
                            className="text-sm font-medium text-foreground hover:underline"
                          >
                            {ps.suppliers.name}
                          </Link>
                          {ps.suppliers.contact_name && (
                            <p className="text-xs text-muted-foreground">
                              {ps.suppliers.contact_name}
                            </p>
                          )}
                        </td>
                        <td className="py-3">
                          {getPlatformBadge(ps.suppliers.platform)}
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">
                          {ps.suppliers.country || "N/A"}
                        </td>
                        <td className="py-3 text-right text-sm font-medium text-foreground">
                          {formatCurrency(ps.unit_cost)}
                        </td>
                        <td className="py-3 text-right text-sm text-muted-foreground">
                          {ps.moq || "N/A"}
                        </td>
                        <td className="py-3 text-right text-sm text-muted-foreground">
                          {ps.lead_time_days ? `${ps.lead_time_days}d` : "N/A"}
                        </td>
                        <td className="py-3 text-center">
                          {ps.is_primary && (
                            <Star className="h-4 w-4 text-yellow-500 mx-auto fill-yellow-500" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {suppliers.map((ps) => (
                  <div
                    key={ps.id}
                    className="rounded-lg border border-border p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/suppliers/${ps.suppliers.id}`}
                        className="text-sm font-medium text-foreground hover:underline"
                      >
                        {ps.suppliers.name}
                      </Link>
                      <div className="flex items-center gap-2">
                        {ps.is_primary && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                        {getPlatformBadge(ps.suppliers.platform)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Costo</span>
                        <p className="font-medium text-foreground">
                          {formatCurrency(ps.unit_cost)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">MOQ</span>
                        <p className="font-medium text-foreground">
                          {ps.moq || "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Lead time</span>
                        <p className="font-medium text-foreground">
                          {ps.lead_time_days ? `${ps.lead_time_days} d\u00EDas` : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Timestamps */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground">
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