"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Scale,
  Star,
  Package,
  Clock,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  X,
  ChevronDown,
  Factory,
} from "lucide-react";
import { Supplier } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { cn, fmt } from "@/lib/utils";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

interface SupplierWithExtras extends Supplier {
  quotes?: { quantity: number; unit_price: number; shipping_cost: number | null; shipping_method: string | null }[];
  products?: { unit_cost: number | null; moq: number | null; lead_time_days: number | null; products: { name: string } }[];
}

export default function CompareSuppliersPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const [suppliers, setSuppliers] = useState<SupplierWithExtras[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState("100");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) {
        const data = await res.json();
        const enriched = await Promise.all(
          data.map(async (s: Supplier) => {
            const [quotesRes, productsRes] = await Promise.all([
              fetch(`/api/suppliers/${s.id}/quotes`).then((r) => (r.ok ? r.json() : [])),
              fetch(`/api/suppliers/${s.id}/products`).then((r) => (r.ok ? r.json() : [])),
            ]);
            return { ...s, quotes: quotesRes || [], products: productsRes || [] };
          })
        );
        setSuppliers(enriched);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const selectedSuppliers = useMemo(
    () => suppliers.filter((s) => selectedIds.includes(s.id)),
    [suppliers, selectedIds]
  );

  const qtyNum = parseInt(quantity) || 100;

  const comparisonData = useMemo(() => {
    return selectedSuppliers.map((s) => {
      const validQuotes = (s.quotes || []).filter(
        (q) => q.quantity <= qtyNum * 1.5 && q.quantity >= qtyNum * 0.5
      );
      const bestQuote = validQuotes.sort((a, b) => a.unit_price - b.unit_price)[0];

      const productCost = s.products?.[0]?.unit_cost;
      const moq = s.products?.[0]?.moq || s.min_order_qty;
      const lead = s.products?.[0]?.lead_time_days || s.lead_time_days;

      const unitPrice = bestQuote?.unit_price || productCost || 0;
      const shippingCost = bestQuote?.shipping_cost || 0;
      const totalProductCost = unitPrice * qtyNum;
      const totalCost = totalProductCost + shippingCost;

      return {
        supplier: s,
        unitPrice,
        shippingCost,
        totalProductCost,
        totalCost,
        moq,
        lead,
        bestQuote,
      };
    });
  }, [selectedSuppliers, qtyNum]);

  const bestSupplier = useMemo(() => {
    if (comparisonData.length === 0) return null;
    return comparisonData.reduce((best, current) =>
      current.totalCost < best.totalCost ? current : best
    );
  }, [comparisonData]);

  const toggleSupplier = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={`h-3 w-3 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
        ))}
      </div>
    );
  };

  if (loading) return <PageSkeleton kpiCount={3} rowCount={4} showSearch={false} />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge={t("suppliers.compare_badge", locale)}
        title={t("suppliers.compare_title", locale)}
        subtitle={t("suppliers.compare_subtitle", locale)}
        breadcrumbs={[{ label: t("dashboard.title", locale), href: "/dashboard" }, { label: t("suppliers.page_title", locale), href: "/suppliers" }, { label: t("suppliers.compare_title", locale) }]}
      >
        <button
          onClick={() => router.push("/suppliers")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border text-muted-foreground text-sm hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("suppliers.compare_back", locale)}
        </button>
      </PageHeader>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Factory className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">{t("suppliers.compare_select", locale)}</h3>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-border bg-muted/50 text-sm text-foreground hover:bg-muted/70 transition-colors"
          >
            <span>
              {selectedIds.length === 0
                ? t("suppliers.compare_choose", locale)
                : t("suppliers.compare_x_selected", locale).replace("{count}", selectedIds.length.toString())}
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showDropdown ? "rotate-180" : ""}`} />
          </button>
          {showDropdown && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg max-h-60 overflow-auto">
              {suppliers.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleSupplier(s.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
                    selectedIds.includes(s.id) ? "bg-cyan-500/5 text-cyan-400" : "text-foreground hover:bg-muted/50"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {selectedIds.includes(s.id) && <CheckCircle2 className="h-4 w-4 text-cyan-400" />}
                    {s.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{s.country || "—"}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedSuppliers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedSuppliers.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-medium border border-cyan-500/20">
                {s.name}
                <button onClick={() => toggleSupplier(s.id)} className="hover:text-cyan-300">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gapx-4 py-3 pt-2 border-t border-border">
          <div className="flex-1 max-w-xs">
            <Label className="text-xs text-muted-foreground">{t("suppliers.compare_quantity", locale)}</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="h-9 bg-muted/50 border-border text-sm mt-1"
              min={1}
            />
          </div>
        </div>
      </div>

      {comparisonData.length > 0 && (
        <>
          {bestSupplier && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">{t("suppliers.compare_recommendation", locale)}</h3>
              </div>
              <p className="text-foreground">
                {t("suppliers.compare_recommendation_text", locale)
                  .replace("{name}", bestSupplier.supplier.name)
                  .replace("{qty}", qtyNum.toString())
                  .replace("{cost}", fmt(bestSupplier.totalCost))}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gapx-4 py-3">
            {comparisonData.map((d, i) => (
              <KpiCard
                key={d.supplier.id}
                label={d.supplier.name}
                value={fmt(d.totalCost)}
                subtitle={`${fmt(d.unitPrice)} / ${t("suppliers.compare_unit", locale)}`}
                icon={d.supplier.id === bestSupplier?.supplier.id ? TrendingUp : DollarSign}
                accentColor={d.supplier.id === bestSupplier?.supplier.id ? "green" : "cyan"}
                animationDelay={i * 75}
              />
            ))}
          </div>

          <DataTableWrapper title={t("suppliers.compare_table_title", locale)} icon={Scale}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="text-start text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">{t("suppliers.compare_metric", locale)}</th>
                    {comparisonData.map((d) => (
                      <th scope="col" key={d.supplier.id} className="text-center text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-foreground font-semibold">{d.supplier.name}</span>
                          {renderStars(d.supplier.rating)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3 text-sm text-muted-foreground">{t("suppliers.compare_unit_price", locale)}</td>
                    {comparisonData.map((d) => (
                      <td key={d.supplier.id} className="px-4 py-3 text-center font-display text-sm text-foreground">
                        {fmt(d.unitPrice)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3 text-sm text-muted-foreground">{t("suppliers.compare_product_cost", locale).replace("{qty}", qtyNum.toString())}</td>
                    {comparisonData.map((d) => (
                      <td key={d.supplier.id} className="px-4 py-3 text-center font-display text-sm text-foreground">
                        {fmt(d.totalProductCost)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3 text-sm text-muted-foreground">{t("suppliers.compare_estimated_shipping", locale)}</td>
                    {comparisonData.map((d) => (
                      <td key={d.supplier.id} className="px-4 py-3 text-center font-display text-sm text-foreground">
                        {fmt(d.shippingCost)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3 text-sm text-muted-foreground">{t("suppliers.compare_total_estimated", locale)}</td>
                    {comparisonData.map((d) => (
                      <td key={d.supplier.id} className={cn(
                        "px-4 py-3 text-center font-display font-bold text-sm",
                        d.supplier.id === bestSupplier?.supplier.id ? "text-emerald-400" : "text-foreground"
                      )}>
                        {fmt(d.totalCost)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" /> {t("suppliers.moq_short", locale)}
                    </td>
                    {comparisonData.map((d) => (
                      <td key={d.supplier.id} className="px-4 py-3 text-center text-sm text-foreground">
                        {d.moq ?? "—"} {t("suppliers.compare_units", locale)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> {t("suppliers.compare_lead_time", locale)}
                    </td>
                    {comparisonData.map((d) => (
                      <td key={d.supplier.id} className="px-4 py-3 text-center text-sm text-foreground">
                        {d.lead ?? "—"} {t("suppliers.compare_days", locale)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5" /> {t("suppliers.rating", locale)}
                    </td>
                    {comparisonData.map((d) => (
                      <td key={d.supplier.id} className="px-4 py-3 text-center">
                        {renderStars(d.supplier.rating)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </DataTableWrapper>
        </>
      )}

      {selectedIds.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Scale className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">{t("suppliers.compare_empty", locale)}</p>
        </div>
      )}
    </div>
  );
}
