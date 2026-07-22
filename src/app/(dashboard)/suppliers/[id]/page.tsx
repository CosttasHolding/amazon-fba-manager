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
  MessageSquare,
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
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { CommentsSection } from "@/components/comments-section";

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

const fmt_ = (v: number | null) => (v ? `$${v.toFixed(2)}` : "—");
const fmt4 = (v: number | null) => (v ? `$${v.toFixed(4)}` : "—");

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
  const { locale } = useLocale();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<LinkedProduct[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
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

  const TABS = [
    { key: "info", label: t("suppliers.detail_tab_info", locale), icon: Factory },
    { key: "quotes", label: t("suppliers.detail_tab_quotes", locale), icon: Quote },
    { key: "products", label: t("suppliers.detail_tab_products", locale), icon: Package },
    { key: "orders", label: t("suppliers.detail_tab_orders", locale), icon: ClipboardList },
    { key: "comments", label: t("suppliers.detail_tab_comments", locale), icon: MessageSquare },
  ];

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
        toast.success(t("suppliers.deleted", locale));
        router.push("/suppliers");
      } else {
        throw new Error("Error");
      }
    } catch {
      toast.error(t("suppliers.delete_error", locale));
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
        toast.success(t("suppliers.quote_saved", locale));
        setShowQuoteModal(false);
        setQuoteForm({ product_id: "", quantity: "", unit_price: "", shipping_method: "", shipping_cost: "", valid_until: "", notes: "" });
        fetchQuotes();
      } else {
        throw new Error("Error");
      }
    } catch {
      toast.error(t("suppliers.error_save_quote", locale));
    } finally {
      setSavingQuote(false);
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/suppliers/${params.id}/quotes?quoteId=${quoteId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("suppliers.quote_deleted", locale));
        fetchQuotes();
      }
    } catch {
      toast.error(t("suppliers.quote_delete_error", locale));
    }
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-sm text-muted-foreground">{t("suppliers.no_rating", locale)}</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`}
          />
        ))}
        <span className="ms-1.5 text-sm text-muted-foreground">({rating}/5)</span>
      </div>
    );
  };

  if (loading) return <DetailSkeleton />;
  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-muted-foreground">{t("suppliers.not_found", locale)}</p>
        <Button variant="outline" onClick={() => router.push("/suppliers")}>{t("suppliers.back_to_list", locale)}</Button>
      </div>
    );
  }

  const infoRows = [
    { label: t("suppliers.field_country", locale), icon: Globe, value: supplier.country || t("suppliers.not_specified", locale) },
    { label: t("suppliers.field_moq", locale), icon: Package, value: supplier.min_order_qty ? `${supplier.min_order_qty} ${t("suppliers.compare_units", locale)}` : t("suppliers.not_specified", locale) },
    { label: t("suppliers.field_lead_time", locale), icon: Clock, value: supplier.lead_time_days ? `${supplier.lead_time_days} ${t("suppliers.compare_days_alt", locale)}` : t("suppliers.not_specified", locale) },
    { label: t("suppliers.field_payment", locale), icon: CreditCard, value: supplier.payment_terms || t("suppliers.not_specified", locale) },
  ];

  const contactRows = [
    { label: t("suppliers.field_contact_name", locale), value: supplier.contact_name || t("suppliers.not_specified", locale), href: null },
    { label: t("suppliers.field_contact_email", locale), value: supplier.contact_email || t("suppliers.not_specified", locale), href: supplier.contact_email ? `mailto:${supplier.contact_email}` : null },
    { label: t("suppliers.field_whatsapp", locale), value: supplier.contact_whatsapp || t("suppliers.not_specified", locale), href: supplier.contact_whatsapp ? `https://wa.me/${supplier.contact_whatsapp.replace(/\D/g, "")}` : null },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge={t("suppliers.badge", locale)}
        title={supplier.name}
        subtitle={t("suppliers.created_prefix", locale) + " " + new Date(supplier.created_at).toLocaleDateString(locale === "en" ? "en-US" : "es-ES")}
        breadcrumbs={[
          { label: t("suppliers.page_title", locale), href: "/suppliers" },
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
            <Edit className="h-4 w-4" />{t("suppliers.edit_button", locale)}
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={deleting}
                className="bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20 hover:text-destructive">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {t("suppliers.delete", locale)}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-popover border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">{t("suppliers.confirm_delete_title", locale)}</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  {t("suppliers.confirm_delete_desc", locale).replace("{name}", supplier.name)}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-muted/50 border-border text-muted-foreground hover:bg-muted">{t("suppliers.edit_cancel", locale)}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting}
                  className="bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20">
                  {deleting ? t("suppliers.deleting", locale) : t("suppliers.delete", locale)}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </PageHeader>

      {/* Tabs */}
      <div role="tablist" className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 border border-border/50 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls={`tabpanel-${tab.key}`}
            tabIndex={activeTab === tab.key ? 0 : -1}
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
              <span className="ms-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">{quotes.length}</span>
            )}
            {tab.key === "products" && products.length > 0 && (
              <span className="ms-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">{products.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {activeTab === "info" && (
        <div id="tabpanel-info" role="tabpanel" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Factory className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{t("suppliers.general_info", locale)}</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("suppliers.rating", locale)}</span>
                {renderStars(supplier.rating)}
              </div>
              {infoRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="flex items-center gap-1.5 text-sm text-foreground">
                    <row.icon className="h-3.5 w-3.5 text-muted-foreground/70" />
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Mail className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{t("suppliers.contact", locale)}</h3>
            </div>
            <div className="space-y-4">
              {contactRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  {row.href ? (
                    <a href={row.href} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                      {row.label === t("suppliers.field_whatsapp", locale) && <Phone className="h-3.5 w-3.5" />}
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
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">{t("suppliers.notes", locale)}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{supplier.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Quotes */}
      {activeTab === "quotes" && (
        <div id="tabpanel-quotes" role="tabpanel" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{t("suppliers.quotes", locale)}</h3>
            <button
              onClick={() => setShowQuoteModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />{t("suppliers.new_quote", locale)}
            </button>
          </div>

          {quotes.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <Quote className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t("suppliers.no_quotes", locale)}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className={tableHeaderClass}>{t("suppliers.quote_table_product", locale)}</th>
                      <th scope="col" className={tableHeaderClass}>{t("suppliers.quote_table_qty", locale)}</th>
                      <th scope="col" className={`${tableHeaderClass} text-end`}>{t("suppliers.quote_table_unit_price", locale)}</th>
                      <th scope="col" className={`${tableHeaderClass} text-end`}>{t("suppliers.quote_table_total", locale)}</th>
                      <th scope="col" className={tableHeaderClass}>{t("suppliers.quote_table_shipping", locale)}</th>
                      <th scope="col" className={tableHeaderClass}>{t("suppliers.quote_table_status", locale)}</th>
                      <th scope="col" className={`${tableHeaderClass} text-center`}>{t("suppliers.quote_table_action", locale)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((q) => (
                      <tr key={q.id} className={`${tableRowClass}`}>
                        <td className={tableCellClass}>
                          <p className="font-medium text-foreground text-sm">{q.products?.name || t("suppliers.no_product", locale)}</p>
                          {q.products?.sku && <p className="text-xs text-muted-foreground font-mono">{q.products.sku}</p>}
                        </td>
                        <td className={tableCellClass}>
                          <span className="text-sm text-foreground">{q.quantity} {t("suppliers.compare_units", locale)}</span>
                        </td>
                        <td className={`${tableCellClass} text-end font-display text-foreground`}>
                          {fmt4(q.unit_price)}
                        </td>
                        <td className={`${tableCellClass} text-end font-display font-semibold text-foreground`}>
                          {fmt_(q.total_price)}
                        </td>
                        <td className={tableCellClass}>
                          <span className="text-xs text-muted-foreground">
                            {q.shipping_method ? `${q.shipping_method} ` : ""}
                            {q.shipping_cost ? fmt_(q.shipping_cost) : "—"}
                          </span>
                        </td>
                        <td className={tableCellClass}>
                          <StatusBadge status={q.status as string} />
                        </td>
                        <td className={`${tableCellClass} text-center`}>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-popover border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-foreground">{t("suppliers.confirm_delete_quote_title", locale)}</AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground">
                                  {t("suppliers.confirm_delete_quote_desc", locale)}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-muted/50 border-border text-muted-foreground hover:bg-muted">{t("suppliers.edit_cancel", locale)}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteQuote(q.id)}
                                  className="bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20">
                                  {t("suppliers.delete", locale)}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
                        <p className="font-medium text-foreground text-sm">{q.products?.name || t("suppliers.no_product", locale)}</p>
                        {q.products?.sku && <p className="text-xs text-muted-foreground font-mono">{q.products.sku}</p>}
                      </div>
                      <StatusBadge status={q.status as string} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                      <div><span className="text-muted-foreground">{t("suppliers.quote_table_qty", locale)}</span><p className="font-medium text-foreground">{q.quantity} {t("suppliers.compare_units", locale)}</p></div>
                      <div><span className="text-muted-foreground">{t("suppliers.quote_table_unit_price", locale)}</span><p className="font-medium text-foreground">{fmt4(q.unit_price)}</p></div>
                      <div><span className="text-muted-foreground">{t("suppliers.quote_table_total", locale)}</span><p className="font-medium text-foreground">{fmt_(q.total_price)}</p></div>
                      <div><span className="text-muted-foreground">{t("suppliers.quote_table_shipping", locale)}</span><p className="font-medium text-foreground">{q.shipping_method || "—"}</p></div>
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
        <div id="tabpanel-products" role="tabpanel">
        <DataTableWrapper title={t("suppliers.products_count", locale).replace("{count}", products.length.toString())}>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-10 w-10 text-muted-foreground/70 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t("suppliers.no_linked_products", locale)}</p>
            </div>
          ) : (
            <div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className={tableHeaderClass}>{t("suppliers.products_table_product", locale)}</th>
                      <th scope="col" className={tableHeaderClass}>SKU</th>
                      <th scope="col" className={`${tableHeaderClass} text-end`}>{t("suppliers.products_table_unit_cost", locale)}</th>
                      <th scope="col" className={`${tableHeaderClass} text-end`}>{t("suppliers.moq_short", locale)}</th>
                      <th scope="col" className={tableHeaderClass}>{t("suppliers.products_table_status", locale)}</th>
                      <th scope="col" className={`${tableHeaderClass} text-center`}>{t("suppliers.products_table_primary", locale)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((item) => (
                      <tr key={item.id} className={`${tableRowClass} cursor-pointer`}
                        onClick={() => router.push(`/products/${item.products.id}`)}>
                        <td className={tableCellClass}>
                          <p className="font-medium text-foreground">{item.products.name}</p>
                          {item.products.asin && <p className="text-xs text-muted-foreground/70">ASIN: {item.products.asin}</p>}
                        </td>
                        <td className={`${tableCellClass} text-muted-foreground font-mono text-xs`}>{item.products.sku}</td>
                        <td className={`${tableCellClass} text-end font-medium text-foreground tabular-nums`}>{fmt_(item.unit_cost)}</td>
                        <td className={`${tableCellClass} text-end text-muted-foreground tabular-nums`}>{item.moq || "—"}</td>
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
                        <p className="text-xs text-muted-foreground/70">SKU: {item.products.sku}</p>
                      </div>
                      <StatusBadge status={item.products.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                      <div><span className="text-muted-foreground">{t("suppliers.products_table_unit_cost", locale)}</span><p className="font-medium text-foreground tabular-nums">{fmt_(item.unit_cost)}</p></div>
                      <div><span className="text-muted-foreground">{t("suppliers.moq_short", locale)}</span><p className="font-medium text-foreground">{item.moq || "—"}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DataTableWrapper>
        </div>
      )}

      {/* Tab: Orders */}
      {activeTab === "orders" && (
        <div id="tabpanel-orders" role="tabpanel" className="rounded-2xl border border-border bg-card p-12 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground/70 mb-1">{t("suppliers.orders_title", locale)}</p>
          <p className="text-sm text-muted-foreground">{t("suppliers.orders_coming_soon", locale)}</p>
        </div>
      )}

      {/* Tab: Comments */}
      {activeTab === "comments" && (
        <div id="tabpanel-comments" role="tabpanel">
        <CommentsSection entity="supplier" entityId={String(params.id)} />
        </div>
      )}

      {/* Quote Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div ref={quoteModalRef} className="bg-popover border border-border rounded-2xl p-6 w-full max-w-lg space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">{t("suppliers.quote_modal_title", locale)}</h3>
              <button onClick={() => setShowQuoteModal(false)} className="p-1 rounded-lg hover:bg-muted transition-colors min-w-[44px] min-h-[44px]">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="quote-product" className="text-xs text-muted-foreground">{t("suppliers.quote_field_product", locale)}</Label>
                <select
                  id="quote-product"
                  value={quoteForm.product_id}
                  onChange={(e) => setQuoteForm({ ...quoteForm, product_id: e.target.value })}
                  className="w-full h-9 rounded-lg border border-border bg-muted/50 text-sm text-foreground px-3"
                >
                  <option value="">{t("suppliers.quote_no_product", locale)}</option>
                  {products.map((p) => (
                    <option key={p.products.id} value={p.products.id}>{p.products.name} ({p.products.sku})</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="quote-quantity" className="text-xs text-muted-foreground">{t("suppliers.quote_field_qty", locale)}</Label>
                <Input id="quote-quantity" type="number" value={quoteForm.quantity}
                  onChange={(e) => setQuoteForm({ ...quoteForm, quantity: e.target.value })}
                  className="h-9 bg-muted/50 border-border text-sm" placeholder={t("suppliers.quote_qty_placeholder", locale)} />
              </div>
              <div>
                <Label htmlFor="quote-unit-price" className="text-xs text-muted-foreground">{t("suppliers.quote_field_unit_price", locale)}</Label>
                <Input id="quote-unit-price" type="number" step="0.0001" value={quoteForm.unit_price}
                  onChange={(e) => setQuoteForm({ ...quoteForm, unit_price: e.target.value })}
                  className="h-9 bg-muted/50 border-border text-sm" placeholder="0.00" />
              </div>
              <div>
                <Label htmlFor="quote-shipping-method" className="text-xs text-muted-foreground">{t("suppliers.quote_shipping_method", locale)}</Label>
                <select
                  id="quote-shipping-method"
                  value={quoteForm.shipping_method}
                  onChange={(e) => setQuoteForm({ ...quoteForm, shipping_method: e.target.value })}
                  className="w-full h-9 rounded-lg border border-border bg-muted/50 text-sm text-foreground px-3"
                >
                  <option value="">{t("suppliers.quote_field_select", locale)}</option>
                  <option value="air">{t("suppliers.quote_field_air", locale)}</option>
                  <option value="sea">{t("suppliers.quote_field_sea", locale)}</option>
                  <option value="express">{t("suppliers.quote_field_express", locale)}</option>
                </select>
              </div>
              <div>
                <Label htmlFor="quote-shipping-cost" className="text-xs text-muted-foreground">{t("suppliers.quote_shipping_cost", locale)}</Label>
                <Input id="quote-shipping-cost" type="number" step="0.01" value={quoteForm.shipping_cost}
                  onChange={(e) => setQuoteForm({ ...quoteForm, shipping_cost: e.target.value })}
                  className="h-9 bg-muted/50 border-border text-sm" placeholder="0.00" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="quote-valid-until" className="text-xs text-muted-foreground">{t("suppliers.quote_valid_until", locale)}</Label>
                <Input id="quote-valid-until" type="date" value={quoteForm.valid_until}
                  onChange={(e) => setQuoteForm({ ...quoteForm, valid_until: e.target.value })}
                  className="h-9 bg-muted/50 border-border text-sm" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="quote-notes" className="text-xs text-muted-foreground">{t("suppliers.quote_notes", locale)}</Label>
                <Input id="quote-notes" value={quoteForm.notes}
                  onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                  className="h-9 bg-muted/50 border-border text-sm" placeholder={t("suppliers.quote_notes_placeholder", locale)} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowQuoteModal(false)}
                className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">{t("suppliers.edit_cancel", locale)}</button>
              <button onClick={handleSaveQuote} disabled={savingQuote || !quoteForm.quantity || !quoteForm.unit_price}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {savingQuote ? <Loader2 className="h-4 w-4 animate-spin" /> : t("suppliers.quote_save", locale)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

