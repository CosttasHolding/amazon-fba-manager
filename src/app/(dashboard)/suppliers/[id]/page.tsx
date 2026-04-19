"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
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
import { toast } from "sonner";
import { Supplier } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DataTableWrapper,
  tableHeaderClass,
  tableCellClass,
  tableRowClass,
} from "@/components/ui/data-table-wrapper";
import { TableSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

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
    status: string;
  };
}

const fmt = (v: number | null) => (v ? `$${v.toFixed(2)}` : "—");

const renderStars = (rating: number | null) => {
  if (!rating)
    return (
      <span className="text-sm text-muted-foreground">Sin rating</span>
    );
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/20"
          }`}
        />
      ))}
      <span className="ml-1.5 text-sm text-muted-foreground">
        ({rating}/5)
      </span>
    </div>
  );
};

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="space-y-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
      <TableSkeleton rows={3} />
    </div>
  );
}

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
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
        toast.success("Proveedor eliminado correctamente");
        router.push("/suppliers");
      } else {
        throw new Error("Error al eliminar");
      }
    } catch {
      toast.error("Error al eliminar el proveedor");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-muted-foreground">Proveedor no encontrado</p>
        <Button variant="outline" onClick={() => router.push("/suppliers")}>
          Volver a proveedores
        </Button>
      </div>
    );
  }

  const infoRows = [
    {
      label: "País",
      icon: Globe,
      value: supplier.country || "No especificado",
    },
    {
      label: "MOQ",
      icon: Package,
      value: supplier.min_order_qty
        ? `${supplier.min_order_qty} unidades`
        : "No especificado",
    },
    {
      label: "Lead Time",
      icon: Clock,
      value: supplier.lead_time_days
        ? `${supplier.lead_time_days} días`
        : "No especificado",
    },
    {
      label: "Pago",
      icon: CreditCard,
      value: supplier.payment_terms || "No especificado",
    },
  ];

  const contactRows = [
    {
      label: "Nombre",
      value: supplier.contact_name || "No especificado",
      href: null,
    },
    {
      label: "Email",
      value: supplier.contact_email || "No especificado",
      href: supplier.contact_email
        ? `mailto:${supplier.contact_email}`
        : null,
    },
    {
      label: "WhatsApp",
      value: supplier.contact_whatsapp || "No especificado",
      href: supplier.contact_whatsapp
        ? `https://wa.me/${supplier.contact_whatsapp.replace(/\D/g, "")}`
        : null,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge="PROVEEDOR"
        title={supplier.name}
        subtitle={`Creado el ${new Date(supplier.created_at).toLocaleDateString("es-ES")}`}
        breadcrumbs={[
          { label: "Proveedores", href: "/suppliers" },
          { label: supplier.name },
        ]}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={supplier.status} />
          {supplier.alibaba_url && (
            <a
              href={supplier.alibaba_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border text-muted-foreground text-sm hover:text-foreground hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Alibaba
            </a>
          )}
          <Link
            href={`/suppliers/${params.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={deleting}
                className="bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20 hover:text-destructive"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-popover border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">
                  ¿Eliminar proveedor?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Se eliminará &quot;{supplier.name}&quot; y todas sus
                  vinculaciones con productos. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-muted/50 border-border text-muted-foreground hover:bg-muted">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20"
                >
                  {deleting ? "Eliminando..." : "Eliminar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </PageHeader>

      {/* Info + Contact Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información general */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Factory className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Información General
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Rating</span>
              {renderStars(supplier.rating)}
            </div>
            {infoRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-muted-foreground">
                  {row.label}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-foreground">
                  <row.icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Contacto */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Mail className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Contacto
            </h3>
          </div>
          <div className="space-y-4">
            {contactRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-muted-foreground">
                  {row.label}
                </span>
                {row.href ? (
                  <a
                    href={row.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                  >
                    {row.label === "WhatsApp" && (
                      <Phone className="h-3.5 w-3.5" />
                    )}
                    {row.value}
                  </a>
                ) : (
                  <span className="text-sm text-foreground">{row.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notas */}
      {supplier.notes && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Notas
            </span>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {supplier.notes}
          </p>
        </div>
      )}

      {/* Productos vinculados */}
      <DataTableWrapper
        title={`${products.length} producto${products.length !== 1 ? "s" : ""} vinculado${products.length !== 1 ? "s" : ""}`}
      >
        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No hay productos vinculados a este proveedor
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className={tableHeaderClass}>Producto</th>
                    <th className={tableHeaderClass}>SKU</th>
                    <th className={`${tableHeaderClass} text-right`}>Costo unit.</th>
                    <th className={`${tableHeaderClass} text-right`}>MOQ</th>
                    <th className={tableHeaderClass}>Estado</th>
                    <th className={`${tableHeaderClass} text-center`}>Principal</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((item) => (
                    <tr
                      key={item.id}
                      className={`${tableRowClass} cursor-pointer`}
                      onClick={() => router.push(`/products/${item.products.id}`)}
                    >
                      <td className={tableCellClass}>
                        <p className="font-medium text-foreground">
                          {item.products.name}
                        </p>
                        {item.products.asin && (
                          <p className="text-xs text-muted-foreground/60">
                            ASIN: {item.products.asin}
                          </p>
                        )}
                      </td>
                      <td className={`${tableCellClass} text-muted-foreground font-mono text-xs`}>
                        {item.products.sku}
                      </td>
                      <td className={`${tableCellClass} text-right font-medium text-foreground tabular-nums`}>
                        {fmt(item.unit_cost)}
                      </td>
                      <td className={`${tableCellClass} text-right text-muted-foreground tabular-nums`}>
                        {item.moq || "—"}
                      </td>
                      <td className={tableCellClass}>
                        <StatusBadge status={item.products.status} />
                      </td>
                      <td className={`${tableCellClass} text-center`}>
                        {item.is_primary && (
                          <Star className="h-4 w-4 text-yellow-500 mx-auto fill-yellow-500" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-3 p-4">
              {products.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => router.push(`/products/${item.products.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground text-sm">
                          {item.products.name}
                        </p>
                        {item.is_primary && (
                          <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground/60">
                        SKU: {item.products.sku}
                      </p>
                    </div>
                    <StatusBadge status={item.products.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                    <div>
                      <span className="text-muted-foreground">Costo</span>
                      <p className="font-medium text-foreground tabular-nums">
                        {fmt(item.unit_cost)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">MOQ</span>
                      <p className="font-medium text-foreground">
                        {item.moq || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DataTableWrapper>
    </div>
  );
}