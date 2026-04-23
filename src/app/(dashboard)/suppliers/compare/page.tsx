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

interface SupplierWithExtras extends Supplier {
  quotes?: { quantity: number; unit_price: number; shipping_cost: number | null; shipping_method: string | null }[];
  products?: { unit_cost: number | null; moq: number | null; lead_time_days: number | null; products: { name: string } }[];
}

export default function CompareSuppliersPage() {
  const router = useRouter();
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
        // Fetch quotes and products for each
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
      console.error("Error:", error);
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
      // Best quote for this quantity
      const validQuotes = (s.quotes || []).filter(
        (q) => q.quantity <= qtyNum * 1.5 && q.quantity >= qtyNum * 0.5
      );
      const bestQuote = validQuotes.sort((a, b) => a.unit_price - b.unit_price)[0];

      // Product cost fallback
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
    if (!rating) return <span className="text-xs text-muted-foreground">\u2014</span>;
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
        badge="COMPARADOR"
        title="Comparar Proveedores"
        subtitle="Seleccioná 2 a 4 proveedores para comparar costos"
      >
        <button
          onClick={() => router.push("/suppliers")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border text-muted-foreground text-sm hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
      </PageHeader>

      {/* Supplier Selector */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Factory className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Seleccionar proveedores</h3>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-border bg-muted/50 text-sm text-foreground hover:bg-muted/70 transition-colors"
          >
            <span>
              {selectedIds.length === 0
                ? "Elegir proveedores..."
                : `${selectedIds.length} seleccionado${selectedIds.length !== 1 ? "s" : ""}`}
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
                  <span className="text-xs text-muted-foreground">{s.country || "\u2014"}</span>
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

        <div className="flex items-center gap-4 pt-2 border-t border-border">
          <div className="flex-1 max-w-xs">
            <Label className="text-xs text-muted-foreground">Cantidad a importar</Label>
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

      {/* Comparison Results */}
      {comparisonData.length > 0 && (
        <>
          {/* Best recommendation */}
          {bestSupplier && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Recomendación</h3>
              </div>
              <p className="text-foreground">
                <span className="font-semibold">{bestSupplier.supplier.name}</span> ofrece el mejor costo total estimado para{" "}
                <span className="font-display font-semibold">{qtyNum}</span> unidades:
                <span className="font-display font-bold text-emerald-400 ml-2">{fmt(bestSupplier.totalCost)}</span>
              </p>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {comparisonData.map((d, i) => (
              <KpiCard
                key={d.supplier.id}
                label={d.supplier.name}
                value={fmt(d.totalCost)}
                subtitle={`${fmt(d.unitPrice)} / ud`}
                icon={d.supplier.id === bestSupplier?.supplier.id ? TrendingUp : DollarSign}
                accentColor={d.supplier.id === bestSupplier?.supplier.id ? "green" : "cyan"}
                animationDelay={i * 75}
              />
            ))}
          </div>

          {/* Comparison Table */}
          <DataTableWrapper title="Comparativa detallada" icon={Scale}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground p-4 uppercase tracking-wider">Métrica</th>
                    {comparisonData.map((d) => (
                      <th key={d.supplier.id} className="text-center text-xs font-medium text-muted-foreground p-4 uppercase tracking-wider">
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
                    <td className="p-4 text-sm text-muted-foreground">Precio unitario</td>
                    {comparisonData.map((d) => (
                      <td key={d.supplier.id} className="p-4 text-center font-display text-sm text-foreground">
                        {fmt(d.unitPrice)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-4 text-sm text-muted-foreground">Costo producto ({qtyNum} uds)</td>
                    {comparisonData.map((d) => (
                      <td key={d.supplier.id} className="p-4 text-center font-display text-sm text-foreground">
                        {fmt(d.totalProductCost)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-4 text-sm text-muted-foreground">Costo envío estimado</td>
                    {comparisonData.map((d) => (
                      <td key={d.supplier.id} className="p-4 text-center font-display text-sm text-foreground">
                        {fmt(d.shippingCost)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-4 text-sm text-muted-foreground">Costo total estimado</td>
                    {comparisonData.map((d) => (
                      <td key={d.supplier.id} className={cn(
                        "p-4 text-center font-display font-bold text-sm",
                        d.supplier.id === bestSupplier?.supplier.id ? "text-emerald-400" : "text-foreground"
                      )}>
                        {fmt(d.totalCost)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-4 text-sm text-muted-foreground flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" /> MOQ
                    </td>
                    {comparisonData.map((d) => (
                      <td key={d.supplier.id} className="p-4 text-center text-sm text-foreground">
                        {d.moq ?? "\u2014"} uds
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-4 text-sm text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Lead time
                    </td>
                    {comparisonData.map((d) => (
                      <td key={d.supplier.id} className="p-4 text-center text-sm text-foreground">
                        {d.lead ?? "\u2014"} d
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 text-sm text-muted-foreground flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5" /> Rating
                    </td>
                    {comparisonData.map((d) => (
                      <td key={d.supplier.id} className="p-4 text-center">
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
          <p className="text-sm text-muted-foreground">Seleccioná al menos 2 proveedores para comparar</p>
        </div>
      )}
    </div>
  );
}
