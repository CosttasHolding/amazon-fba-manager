"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
import { DataTableWrapper, tableHeaderClass, tableCellClass, tableRowClass } from "@/components/ui/data-table-wrapper";

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

const fmt = (v: number | null) => (v ? `$${v.toFixed(2)}` : "—");

const renderStars = (rating: number | null) => {
  if (!rating) return <span className="text-white/25 text-sm">Sin rating</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= rating ? "fill-amber-400 text-amber-400" : "text-white/10"
          }`}
        />
      ))}
      <span className="ml-1.5 text-sm text-white/40">({rating}/5)</span>
    </div>
  );
};

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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          <span className="text-sm text-white/40">Cargando proveedor...</span>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <p className="text-white/50">Proveedor no encontrado</p>
        <button
          onClick={() => router.push("/suppliers")}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 transition-colors"
        >
          Volver a proveedores
        </button>
      </div>
    );
  }

  const infoRows = [
    { label: "Pais", icon: Globe, value: supplier.country || "No especificado" },
    { label: "MOQ", icon: Package, value: supplier.min_order_qty ? `${supplier.min_order_qty} unidades` : "No especificado" },
    { label: "Lead Time", icon: Clock, value: supplier.lead_time_days ? `${supplier.lead_time_days} dias` : "No especificado" },
    { label: "Pago", icon: CreditCard, value: supplier.payment_terms || "No especificado" },
  ];

  const contactRows = [
    { label: "Nombre", value: supplier.contact_name || "No especificado", href: null },
    { label: "Email", value: supplier.contact_email || "No especificado", href: supplier.contact_email ? `mailto:${supplier.contact_email}` : null },
    { label: "WhatsApp", value: supplier.contact_whatsapp || "No especificado", href: supplier.contact_whatsapp ? `https://wa.me/${supplier.contact_whatsapp.replace(/\D/g, "")}` : null },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm hover:text-white/70 hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Alibaba
            </a>
          )}
          <Link
            href={`/suppliers/${params.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Eliminar
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#0a0e1a] border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">
                  Eliminar proveedor?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-white/50">
                  Se eliminara &quot;{supplier.name}&quot; y todas sus vinculaciones con productos.
                  Esta accion no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
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
        {/* General Info */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="flex items-center gap-2 mb-5">
            <Factory className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
              Informacion General
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/40">Rating</span>
              {renderStars(supplier.rating)}
            </div>
            {infoRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-sm text-white/40">{row.label}</span>
                <span className="flex items-center gap-1.5 text-sm text-white/70">
                  <row.icon className="h-3.5 w-3.5 text-white/30" />
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="flex items-center gap-2 mb-5">
            <Mail className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
              Contacto
            </h3>
          </div>
          <div className="space-y-4">
            {contactRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-sm text-white/40">{row.label}</span>
                {row.href ? (
                  <a
                    href={row.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                  >
                    {row.label === "WhatsApp" && <Phone className="h-3.5 w-3.5" />}
                    {row.value}
                  </a>
                ) : (
                  <span className="text-sm text-white/70">{row.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notes */}
      {supplier.notes && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-white/80 uppercase tracking-wider">
              Notas
            </span>
          </div>
          <p className="text-sm text-white/50 whitespace-pre-wrap leading-relaxed">
            {supplier.notes}
          </p>
        </div>
      )}

      {/* Linked Products */}
      <DataTableWrapper
        title={`${products.length} producto${products.length !== 1 ? "s" : ""} vinculado${products.length !== 1 ? "s" : ""}`}
      >
        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-10 w-10 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40">
              No hay productos vinculados a este proveedor
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
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
                        <p className="font-medium text-white/80">{item.products.name}</p>
                        {item.products.asin && (
                          <p className="text-xs text-white/30">ASIN: {item.products.asin}</p>
                        )}
                      </td>
                      <td className={`${tableCellClass} text-white/40 font-mono text-xs`}>
                        {item.products.sku}
                      </td>
                      <td className={`${tableCellClass} text-right font-medium text-white/80 tabular-nums`}>
                        {fmt(item.unit_cost)}
                      </td>
                      <td className={`${tableCellClass} text-right text-white/40 tabular-nums`}>
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
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 cursor-pointer hover:bg-white/[0.04] transition-colors"
                  onClick={() => router.push(`/products/${item.products.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white/80 text-sm">{item.products.name}</p>
                        {item.is_primary && (
                          <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <p className="text-xs text-white/30">SKU: {item.products.sku}</p>
                    </div>
                    <StatusBadge status={item.products.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                    <div>
                      <span className="text-white/30">Costo</span>
                      <p className="font-medium text-white/70 tabular-nums">{fmt(item.unit_cost)}</p>
                    </div>
                    <div>
                      <span className="text-white/30">MOQ</span>
                      <p className="font-medium text-white/70">{item.moq || "—"}</p>
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