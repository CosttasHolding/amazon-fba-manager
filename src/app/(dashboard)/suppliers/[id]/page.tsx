"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Factory,
  Globe,
  Star,
  Clock,
  Package,
  Mail,
  Phone,
  ExternalLink,
  CreditCard,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { Supplier } from "@/types";

interface LinkedProduct {
  id: string;
  unit_cost: number | null;
  moq: number | null;
  lead_time_days: number | null;
  is_primary: boolean;
  notes: string | null;
  products: {
    id: string;
    name: string;
    sku: string;
    asin: string | null;
    sale_price: number;
    status: string;
  };
}

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<LinkedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchSupplier();
      fetchProducts();
    }
  }, [params.id]);

  const fetchSupplier = async () => {
    try {
      const res = await fetch(`/api/suppliers/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setSupplier(data);
      } else {
        router.push("/suppliers");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/suppliers/${params.id}/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/suppliers/${params.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast({
          title: "Proveedor eliminado",
          description: "El proveedor fue eliminado correctamente",
        });
        router.push("/suppliers");
        router.refresh();
      } else {
        throw new Error("Error al eliminar");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-muted-foreground">Sin rating</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-muted-foreground">({rating}/5)</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-lg font-semibold">Proveedor no encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/suppliers")}>
          Volver a Proveedores
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/suppliers")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{supplier.name}</h1>
              <Badge
                className={
                  supplier.status === "active"
                    ? "bg-green-500/10 text-green-500"
                    : "bg-red-500/10 text-red-500"
                }
              >
                {supplier.status === "active" ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Creado el {new Date(supplier.created_at).toLocaleDateString("es")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {supplier.alibaba_url && (
            <Button
              variant="outline"
              onClick={() => window.open(supplier.alibaba_url!, "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Ver en Alibaba
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push(`/suppliers/${params.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" /> Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminará &quot;{supplier.name}&quot; y todas sus vinculaciones con productos.
                  Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Eliminando..." : "Eliminar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Datos del Proveedor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" /> Información General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">País</span>
              <span className="flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-muted-foreground" />
                {supplier.country || "No especificado"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Rating</span>
              {renderStars(supplier.rating)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">MOQ</span>
              <span className="flex items-center gap-1.5">
                <Package className="h-4 w-4 text-muted-foreground" />
                {supplier.min_order_qty ? `${supplier.min_order_qty} unidades` : "No especificado"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Lead Time</span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {supplier.lead_time_days ? `${supplier.lead_time_days} días` : "No especificado"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pago</span>
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                {supplier.payment_terms || "No especificado"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Contacto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Nombre</span>
              <span>{supplier.contact_name || "No especificado"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              {supplier.contact_email ? (
                <a href={`mailto:${supplier.contact_email}`} className="text-blue-500 hover:underline">
                  {supplier.contact_email}
                </a>
              ) : (
                <span>No especificado</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">WhatsApp</span>
              {supplier.contact_whatsapp ? (
                <a
                  href={`https://wa.me/${supplier.contact_whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-500 hover:underline flex items-center gap-1"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {supplier.contact_whatsapp}
                </a>
              ) : (
                <span>No especificado</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notas */}
      {supplier.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{supplier.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Productos Vinculados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Productos Vinculados
          </CardTitle>
          <CardDescription>
            {products.length} producto{products.length !== 1 ? "s" : ""} de este proveedor
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No hay productos vinculados a este proveedor
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/products/${item.products.id}`)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{item.products.name}</p>
                      {item.is_primary && (
                        <Badge className="bg-blue-500/10 text-blue-500 text-xs">Principal</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      SKU: {item.products.sku}
                      {item.products.asin && ` · ASIN: ${item.products.asin}`}
                    </p>
                  </div>
                  <div className="text-right">
                    {item.unit_cost && (
                      <p className="font-medium">${item.unit_cost.toFixed(2)}</p>
                    )}
                    {item.moq && (
                      <p className="text-xs text-muted-foreground">MOQ: {item.moq}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}