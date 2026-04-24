"use client";

import { useEffect, useState, useRef } from "react";
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
  Quote,
  ClipboardList,
  Plus,
  X,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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

interface QuoteItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  valid_until: string | null;
  shipping_method: string | null;
  shipping_cost: number | null;
  notes: string | null;
  status: string;
  created_at: string;
  products?: { name: string; sku: string } | null;
}

const fmt = (v: number | null) => (v ? `$${v.toFixed(2)}` : "—");
const fmt4 = (v: number | null) => (v ? `$${v.toFixed(4)}` : "—");

const renderStars = (rating: number | null) => {
  if (!rating) return <span className="text-sm text-muted-foreground">Sin rating</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`}
        />
      ))}
      <span className="ml-1.5 text-sm text-muted-foreground">({rating}/5)</span>
    </div>
  );
};

const TABS = [
  { key: "info", label: "Información", icon: Factory },
  { key: "quotes", label: "Cotizaciones", icon: Quote },
  { key: "products", label: "Productos", icon: Package },
  { key: "orders", label: "Pedidos", icon: ClipboardList },
] as const;

type TabKey = typeof TABS[number]["key"];

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
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const quoteModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showQuoteModal) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowQuoteModal(false); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showQuoteModal]);

  useEffect(() => {
    if (!showQuoteModal) return;
    const handleClick = (e: MouseEvent) => {
      if (quoteModalRef.current && !quoteModalRef.current.contains(e.target as Node)) setShowQuoteModal(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showQuoteModal]);
  const [quoteForm, setQuoteForm] = useState({
    product_id: "",
    quantity: "",
    unit_price: "",
    shipping_method: "",
    shipping_cost: "",
    valid_until: "",
    notes: "",
  });
  const [savingQuote, setSavingQuote] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchSupplier();
      fetchProducts();
      fetchQuotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    }
  };

  const fetchQuotes = async () => {
    try {
      const res = await fetch(`/api/suppliers/${params.id}/quotes`);
      if (res.ok) {
        const data = await res.json();
        setQuotes(data);
      }
    } catch (error) {
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/suppliers/${params.id}`, { method: "DELETE" });
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

  const handleSaveQuote = async () => {
    setSavingQuote(true);
    try {
      const body = {
        product_id: quoteForm.product_id || null,
        quantity: parseInt(quoteForm.quantity) || 0,
        unit_price: parseFloat(quoteForm.unit_price) || 0,
        shipping_method: quoteForm.shipping_method || null,
        shipping_cost: quoteForm.shipping_cost ? parseFloat(quoteForm.shipping_cost) : null,
        valid_until: quoteForm.valid_until || null,
        notes: quoteForm.notes || null,
      };
      const res = await fetch(`/api/suppliers/${params.id}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success("Cotización guardada");
        setShowQuoteModal(false);
        setQuoteForm({ product_id: "", quantity: "", unit_price: "", shipping_method: "", shipping_cost: "", valid_until: "", notes: "" });
        fetchQuotes();
      } else {
        throw new Error("Error al guardar");
      }
    } catch {
      toast.error("Error al guardar cotización");
    } finally {
      setSavingQuote(false);
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/suppliers/${params.id}/quotes?quoteId=${quoteId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Cotización eliminada");
        fetchQuotes();
      }
    } catch {
      toast.error("Error al eliminar cotización");
    }
  };

  if (loading) return <DetailSkeleton />;
  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-muted-foreground">Proveedor no encontrado</p>
        <Button variant="outline" onClick={() => router.push("/suppliers")}>Volver a proveedores</Button>
      </div>
    );
  }

  const infoRows = [
    { label: "País", icon: Globe, value: supplier.country || "No especificado" },
    { label: "MOQ", icon: Package, value: supplier.min_order_qty ? `${supplier.min_order_qty} unidades` : "No especificado" },
    { label: "Lead Time", icon: Clock, value: supplier.lead_time_days ? `${supplier.lead_time_days} días` : "No especificado" },
    { label: "Pago", icon: CreditCard, value: supplier.payment_terms || "No especificado" },
  ];

  const contactRows = [
    { label: "Nombre", value: supplier.contact_name || "No especificado", href: null },
    { label: "Email", value: supplier.contact_email || "No especificado", href: supplier.contact_email ? `mailto:${supplier.contact_email}` : null },
    { label: "WhatsApp", value: supplier.contact_whatsapp || "No especificado", href: supplier.contact_whatsapp ? `https://wa.me/${supplier.contact_whatsapp.replace(/\D/g, "")}` : null },
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
            <a href={supplier.alibaba_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border text-muted-foreground text-sm hover:text-foreground hover:bg-muted transition-colors">
              <ExternalLink className="h-4 w-4" />Alibaba
            </a>
          )}
          <Link href={`/suppliers/${params.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
            <Edit className="h-4 w-4" />Editar
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={deleting}
                className="bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20 hover:text-destructive">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-popover border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">¿Eliminar proveedor?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Se eliminará &quot;{supplier.name}&quot; y todas sus vinculaciones. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-muted/50 border-border text-muted-foreground hover:bg-muted">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting}
                  className="bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20">
                  {deleting ? "Eliminando..." : "Eliminar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </PageHeader>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 border border-border/50 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
              activeTab === tab.key
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.key === "quotes" && quotes.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">{quotes.length}</span>
            )}
            {tab.key === "products" && products.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">{products.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Factory className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Información General</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rating</span>
                {renderStars(supplier.rating)}
              </div>
              {infoRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="flex items-center gap-1.5 text-sm text-foreground">
                    <row.icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Mail className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Contacto</h3>
            </div>
            <div className="space-y-4">
              {contactRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  {row.href ? (
                    <a href={row.href} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                      {row.label === "WhatsApp" && <Phone className="h-3.5 w-3.5" />}
                      {row.value}
                    </a>
                  ) : (
                    <span className="text-sm text-foreground">{row.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          {supplier.notes && (
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Notas</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{supplier.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Quotes */}
      {activeTab === "quotes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Cotizaciones</h3>
            <button
              onClick={() => setShowQuoteModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />Nueva cotización
            </button>
          </div>

          {quotes.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <Quote className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No hay cotizaciones registradas</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className={tableHeaderClass}>Producto</th>
                      <th className={tableHeaderClass}>Cantidad</th>
                      <th className={`${tableHeaderClass} text-right`}>Precio unit.</th>
                      <th className={`${tableHeaderClass} text-right`}>Total</th>
                      <th className={tableHeaderClass}>Envío</th>
                      <th className={tableHeaderClass}>Estado</th>
                      <th className={`${tableHeaderClass} text-center`}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((q) => (
                      <tr key={q.id} className={`${tableRowClass}`}>
                        <td className={tableCellClass}>
                          <p className="font-medium text-foreground text-sm">{q.products?.name || "Sin producto"}</p>
                          {q.products?.sku && <p className="text-xs text-muted-foreground font-mono">{q.products.sku}</p>}
                        </td>
                        <td className={tableCellClass}>
                          <span className="text-sm text-foreground">{q.quantity} uds</span>
                        </td>
                        <td className={`${tableCellClass} text-right font-display text-foreground`}>
                          {fmt4(q.unit_price)}
                        </td>
                        <td className={`${tableCellClass} text-right font-display font-semibold text-foreground`}>
                          {fmt(q.total_price)}
                        </td>
                        <td className={tableCellClass}>
                          <span className="text-xs text-muted-foreground">
                            {q.shipping_method ? `${q.shipping_method} ` : ""}
                            {q.shipping_cost ? fmt(q.shipping_cost) : "—"}
                          </span>
                        </td>
                        <td className={tableCellClass}>
                          <StatusBadge status={q.status as string} />
                        </td>
                        <td className={`${tableCellClass} text-center`}>
                          <button
                            onClick={() => handleDeleteQuote(q.id)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-3 p-4">
                {quotes.map((q) => (
                  <div key={q.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-foreground text-sm">{q.products?.name || "Sin producto"}</p>
                        {q.products?.sku && <p className="text-xs text-muted-foreground font-mono">{q.products.sku}</p>}
                      </div>
                      <StatusBadge status={q.status as string} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                      <div><span className="text-muted-foreground">Cantidad</span><p className="font-medium text-foreground">{q.quantity} uds</p></div>
                      <div><span className="text-muted-foreground">Precio unit.</span><p className="font-medium text-foreground">{fmt4(q.unit_price)}</p></div>
                      <div><span className="text-muted-foreground">Total</span><p className="font-medium text-foreground">{fmt(q.total_price)}</p></div>
                      <div><span className="text-muted-foreground">Envío</span><p className="font-medium text-foreground">{q.shipping_method || "—"}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Products */}
      {activeTab === "products" && (
        <DataTableWrapper title={`${products.length} producto${products.length !== 1 ? "s" : ""} vinculado${products.length !== 1 ? "s" : ""}`}>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No hay productos vinculados a este proveedor</p>
            </div>
          ) : (
            <div>
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
                      <tr key={item.id} className={`${tableRowClass} cursor-pointer`}
                        onClick={() => router.push(`/products/${item.products.id}`)}>
                        <td className={tableCellClass}>
                          <p className="font-medium text-foreground">{item.products.name}</p>
                          {item.products.asin && <p className="text-xs text-muted-foreground/60">ASIN: {item.products.asin}</p>}
                        </td>
                        <td className={`${tableCellClass} text-muted-foreground font-mono text-xs`}>{item.products.sku}</td>
                        <td className={`${tableCellClass} text-right font-medium text-foreground tabular-nums`}>{fmt(item.unit_cost)}</td>
                        <td className={`${tableCellClass} text-right text-muted-foreground tabular-nums`}>{item.moq || "—"}</td>
                        <td className={tableCellClass}><StatusBadge status={item.products.status} /></td>
                        <td className={`${tableCellClass} text-center`}>
                          {item.is_primary && <Star className="h-4 w-4 text-yellow-500 mx-auto fill-yellow-500" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-3 p-4">
                {products.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => router.push(`/products/${item.products.id}`)}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground text-sm">{item.products.name}</p>
                          {item.is_primary && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground/60">SKU: {item.products.sku}</p>
                      </div>
                      <StatusBadge status={item.products.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                      <div><span className="text-muted-foreground">Costo</span><p className="font-medium text-foreground tabular-nums">{fmt(item.unit_cost)}</p></div>
                      <div><span className="text-muted-foreground">MOQ</span><p className="font-medium text-foreground">{item.moq || "—"}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DataTableWrapper>
      )}

      {/* Tab: Orders */}
      {activeTab === "orders" && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground/70 mb-1">Pedidos</p>
          <p className="text-sm text-muted-foreground">El módulo de pedidos estará disponible pronto</p>
        </div>
      )}

      {/* Quote Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div ref={quoteModalRef} className="bg-popover border border-border rounded-2xl p-6 w-full max-w-lg space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Nueva Cotización</h3>
              <button onClick={() => setShowQuoteModal(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Producto (opcional)</Label>
                <select
                  value={quoteForm.product_id}
                  onChange={(e) => setQuoteForm({ ...quoteForm, product_id: e.target.value })}
                  className="w-full h-9 rounded-lg border border-border bg-muted/50 text-sm text-foreground px-3"
                >
                  <option value="">Sin producto asociado</option>
                  {products.map((p) => (
                    <option key={p.products.id} value={p.products.id}>{p.products.name} ({p.products.sku})</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cantidad *</Label>
                <Input type="number" value={quoteForm.quantity}
                  onChange={(e) => setQuoteForm({ ...quoteForm, quantity: e.target.value })}
                  className="h-9 bg-muted/50 border-border text-sm" placeholder="100" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Precio unitario *</Label>
                <Input type="number" step="0.0001" value={quoteForm.unit_price}
                  onChange={(e) => setQuoteForm({ ...quoteForm, unit_price: e.target.value })}
                  className="h-9 bg-muted/50 border-border text-sm" placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Método envío</Label>
                <select
                  value={quoteForm.shipping_method}
                  onChange={(e) => setQuoteForm({ ...quoteForm, shipping_method: e.target.value })}
                  className="w-full h-9 rounded-lg border border-border bg-muted/50 text-sm text-foreground px-3"
                >
                  <option value="">Seleccionar</option>
                  <option value="air">Aéreo</option>
                  <option value="sea">Marítimo</option>
                  <option value="express">Express</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Costo envío</Label>
                <Input type="number" step="0.01" value={quoteForm.shipping_cost}
                  onChange={(e) => setQuoteForm({ ...quoteForm, shipping_cost: e.target.value })}
                  className="h-9 bg-muted/50 border-border text-sm" placeholder="0.00" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Válido hasta</Label>
                <Input type="date" value={quoteForm.valid_until}
                  onChange={(e) => setQuoteForm({ ...quoteForm, valid_until: e.target.value })}
                  className="h-9 bg-muted/50 border-border text-sm" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Notas</Label>
                <Input value={quoteForm.notes}
                  onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                  className="h-9 bg-muted/50 border-border text-sm" placeholder="Notas adicionales..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowQuoteModal(false)}
                className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleSaveQuote} disabled={savingQuote || !quoteForm.quantity || !quoteForm.unit_price}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {savingQuote ? "Guardando..." : "Guardar cotización"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
