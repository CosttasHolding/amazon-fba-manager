"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmt, fmtPct } from "@/lib/utils";
import { calcFBAFee } from "@/lib/calculations";
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Percent,
  Target,
  Package,
  Truck,
  Weight,
  Scale,
  Camera,
  Megaphone,
  Save,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "electronics", label: "Electr\u00F3nica", refPct: 15 },
  { value: "home", label: "Hogar y Cocina", refPct: 15 },
  { value: "beauty", label: "Belleza", refPct: 8 },
  { value: "toys", label: "Juguetes", refPct: 15 },
  { value: "sports", label: "Deportes", refPct: 15 },
  { value: "clothing", label: "Ropa", refPct: 17 },
  { value: "health", label: "Salud", refPct: 15 },
  { value: "other", label: "Otra", refPct: 15 },
];

const SHIPPING_RATES: Record<string, number> = { air: 6.5, sea: 1.2, express: 12 };

interface Inputs {
  salePrice: string; unitCost: string; shippingPerKg: string;
  weightKg: string; quantity: string; prepCost: string;
  photoCost: string; ppcBudget: string; otherFees: string;
}

function calculate(inputs: Inputs, refPct: number) {
  const sp = parseFloat(inputs.salePrice) || 0;
  const uc = parseFloat(inputs.unitCost) || 0;
  const wk = parseFloat(inputs.weightKg) || 0;
  const qty = parseInt(inputs.quantity) || 1;
  const shipKg = parseFloat(inputs.shippingPerKg) || 0;
  const prep = parseFloat(inputs.prepCost) || 0;
  const photo = parseFloat(inputs.photoCost) || 0;
  const ppc = parseFloat(inputs.ppcBudget) || 0;
  const other = parseFloat(inputs.otherFees) || 0;
  if (sp <= 0 && uc <= 0) return null;

  const fbaFee = calcFBAFee(wk);
  const refFee = sp * (refPct / 100);
  const freightPerUnit = shipKg * wk;
  const photoPerUnit = qty > 0 ? photo / qty : 0;
  const ppcPerUnit = qty > 0 ? ppc / qty : 0;
  const totalCost = uc + freightPerUnit + prep + photoPerUnit;
  const totalFees = refFee + fbaFee + other + ppcPerUnit;
  const landedCost = totalCost + totalFees;
  const netProfit = sp - landedCost;
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  const margin = sp > 0 ? (netProfit / sp) * 100 : 0;
  const breakEvenPrice = landedCost;
  const breakEvenUnits = netProfit > 0 && ppc > 0 ? Math.ceil(ppc / netProfit) : 0;
  const tacos = sp > 0 ? (ppcPerUnit / sp) * 100 : 0;

  return {
    fbaFee, refFee, refPct, freightPerUnit, prep, photoPerUnit, ppcPerUnit, other,
    totalCost, totalFees, landedCost, netProfit, roi, margin, breakEvenPrice, breakEvenUnits, tacos, qty,
  };
}

function calcScenario(base: Inputs, refPct: number, priceMult: number, qtyMult: number) {
  return calculate({
    ...base,
    salePrice: String((parseFloat(base.salePrice) || 0) * priceMult),
    quantity: String(Math.round((parseInt(base.quantity) || 100) * qtyMult)),
  }, refPct);
}

export default function CalculatorPage() {
  const [category, setCategory] = useState("home");
  const [shippingMethod, setShippingMethod] = useState("air");
  const [showConfig, setShowConfig] = useState(false);
  const [targetRoi, setTargetRoi] = useState("30");

  const [inputs, setInputs] = useState<Inputs>({
    salePrice: "", unitCost: "", shippingPerKg: String(SHIPPING_RATES.air),
    weightKg: "0.5", quantity: "100", prepCost: "0",
    photoCost: "0", ppcBudget: "0", otherFees: "0",
  });

  const refPct = CATEGORIES.find((c) => c.value === category)?.refPct || 15;
  const result = useMemo(() => calculate(inputs, refPct), [inputs, refPct]);
  const pessimistic = useMemo(() => calcScenario(inputs, refPct, 0.85, 0.6), [inputs, refPct]);
  const optimistic = useMemo(() => calcScenario(inputs, refPct, 1.15, 1.4), [inputs, refPct]);
  const targetRoiNum = parseFloat(targetRoi) || 30;

  const update = (key: keyof Inputs, value: string) => setInputs((p) => ({ ...p, [key]: value }));
  const handleShipping = (method: string) => {
    setShippingMethod(method);
    update("shippingPerKg", String(SHIPPING_RATES[method] || 0));
  };

  const handleSave = async () => {
    if (!result) { toast.error("Calculá primero para guardar"); return; }
    try {
      const res = await fetch("/api/calculator/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Análisis ${new Date().toLocaleDateString("es-ES")}`,
          sale_price: parseFloat(inputs.salePrice) || 0, unit_cost: parseFloat(inputs.unitCost) || 0,
          shipping_cost: parseFloat(inputs.shippingPerKg) || 0, prep_cost: parseFloat(inputs.prepCost) || 0,
          taxes: 0, weight_kg: parseFloat(inputs.weightKg) || 0, fba_fee: result.fbaFee,
          referral_fee: result.refFee, other_fees: parseFloat(inputs.otherFees) || 0,
          ppc_budget: parseFloat(inputs.ppcBudget) || 0, net_profit: result.netProfit,
          roi: result.roi, margin: result.margin, total_cost: result.totalCost,
          notes: `Categoría: ${category}, Envío: ${shippingMethod}, Cantidad: ${inputs.quantity}`,
        }),
      });
      if (res.ok) toast.success("Análisis guardado");
      else throw new Error("Error");
    } catch { toast.error("Error al guardar análisis"); }
  };

  const inputCls = "h-11 bg-card border-border rounded-xl text-sm text-center font-display text-foreground focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/40 placeholder:text-muted-foreground/40";
  const labelCls = "text-[10px] font-display uppercase tracking-wider text-muted-foreground mb-1 block text-center";

  return (
    <div className="max-w-5xl space-y-6 animate-fade-up">
      <PageHeader badge="CALCULADORA" title="Calculadora FBA" subtitle="Estimá costos, ROI y tomá decisiones de sourcing" />

      {/* Config */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <button onClick={() => setShowConfig(!showConfig)} className="flex items-center justify-between w-full text-left">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Configuración</span>
          </div>
          <span className="text-xs text-muted-foreground">ROI: {targetRoiNum}% | Ref: {refPct}% | {shippingMethod.toUpperCase()}</span>
          {showConfig ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showConfig && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            <div>
              <Label className={labelCls}>ROI Objetivo (%)</Label>
              <Input type="number" value={targetRoi} onChange={(e) => setTargetRoi(e.target.value)} className={inputCls} />
            </div>
            <div>
              <Label className={labelCls}>Categoría</Label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-11 rounded-xl border border-border bg-card text-sm text-foreground px-3 font-display">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label} ({c.refPct}%)</option>)}
              </select>
            </div>
            <div>
              <Label className={labelCls}>Envío</Label>
              <select value={shippingMethod} onChange={(e) => handleShipping(e.target.value)} className="w-full h-11 rounded-xl border border-border bg-card text-sm text-foreground px-3 font-display">
                <option value="air">Aéreo (${SHIPPING_RATES.air}/kg)</option>
                <option value="sea">Marítimo (${SHIPPING_RATES.sea}/kg)</option>
                <option value="express">Express (${SHIPPING_RATES.express}/kg)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Calculator Body */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Inputs (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Datos del Producto</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className={labelCls}>Precio Venta ($)</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={inputs.salePrice} onChange={(e) => update("salePrice", e.target.value)} className={inputCls} />
            </div>
            <div>
              <Label className={labelCls}>Costo ($)</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={inputs.unitCost} onChange={(e) => update("unitCost", e.target.value)} className={inputCls} />
            </div>
            <div>
              <Label className={labelCls}>Cantidad</Label>
              <Input type="number" value={inputs.quantity} onChange={(e) => update("quantity", e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className={labelCls}><span className="flex items-center justify-center gap-1"><Weight className="h-3 w-3" /> Peso (kg)</span></Label>
              <Input type="number" step="0.01" value={inputs.weightKg} onChange={(e) => update("weightKg", e.target.value)} className={inputCls} />
            </div>
            <div>
              <Label className={labelCls}><span className="flex items-center justify-center gap-1"><Truck className="h-3 w-3" /> Flete ($/kg)</span></Label>
              <Input type="number" step="0.01" value={inputs.shippingPerKg} onChange={(e) => update("shippingPerKg", e.target.value)} className={inputCls} />
            </div>
            <div>
              <Label className={labelCls}><span className="flex items-center justify-center gap-1"><Package className="h-3 w-3" /> Prep ($)</span></Label>
              <Input type="number" step="0.01" value={inputs.prepCost} onChange={(e) => update("prepCost", e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className={labelCls}><span className="flex items-center justify-center gap-1"><Camera className="h-3 w-3" /> Fotos ($)</span></Label>
              <Input type="number" step="0.01" value={inputs.photoCost} onChange={(e) => update("photoCost", e.target.value)} className={inputCls} />
            </div>
            <div>
              <Label className={labelCls}><span className="flex items-center justify-center gap-1"><Megaphone className="h-3 w-3" /> PPC ($)</span></Label>
              <Input type="number" step="0.01" value={inputs.ppcBudget} onChange={(e) => update("ppcBudget", e.target.value)} className={inputCls} />
            </div>
            <div>
              <Label className={labelCls}><span className="flex items-center justify-center gap-1"><DollarSign className="h-3 w-3" /> Otros ($)</span></Label>
              <Input type="number" step="0.01" value={inputs.otherFees} onChange={(e) => update("otherFees", e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Right: Display (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Digital Display */}
          <div className="rounded-2xl border border-border bg-[#0a1020] p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-display uppercase tracking-[0.2em] text-blue-600 dark:text-cyan-400">Display</span>
                <Calculator className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400/50" />
              </div>
              {result ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Ganancia Neta</p>
                      <p className={cn("font-display text-2xl font-bold tabular-nums", result.netProfit >= 0 ? "text-green-600 dark:text-emerald-400" : "text-red-600 dark:text-rose-400")}>
                        {fmt(result.netProfit)}
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">ROI</p>
                      <p className={cn("font-display text-2xl font-bold tabular-nums",
                        result.roi >= targetRoiNum ? "text-green-600 dark:text-emerald-400" : result.roi >= targetRoiNum / 2 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-rose-400"
                      )}>
                        {fmtPct(result.roi)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
                      <p className="text-[9px] text-muted-foreground uppercase">Margen</p>
                      <p className="font-display text-sm font-semibold text-foreground">{fmtPct(result.margin)}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
                      <p className="text-[9px] text-muted-foreground uppercase">Landed</p>
                      <p className="font-display text-sm font-semibold text-foreground">{fmt(result.landedCost)}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
                      <p className="text-[9px] text-muted-foreground uppercase">Break-even</p>
                      <p className="font-display text-sm font-semibold text-foreground">{fmt(result.breakEvenPrice)}</p>
                    </div>
                  </div>
                  {result.ppcPerUnit > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
                        <p className="text-[9px] text-muted-foreground uppercase">TACOS</p>
                        <p className="font-display text-sm font-semibold text-foreground">{fmtPct(result.tacos)}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
                        <p className="text-[9px] text-muted-foreground uppercase">Units/mes PPC</p>
                        <p className="font-display text-sm font-semibold text-foreground">{result.breakEvenUnits > 0 ? result.breakEvenUnits : "—"}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Ingresá precio y costo</p>
                </div>
              )}
            </div>
          </div>

          {/* Cost Breakdown Ticket */}
          {result && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <p className="text-[10px] font-display uppercase tracking-wider text-muted-foreground text-center">Ticket de Costos</p>
              <div className="space-y-1.5">
                {[
                  { label: "Referral Fee", value: result.refFee, pct: (result.refFee / result.landedCost) * 100, color: "#ef4444" },
                  { label: "FBA Fee", value: result.fbaFee, pct: (result.fbaFee / result.landedCost) * 100, color: "#10b981" },
                  { label: "Flete", value: result.freightPerUnit, pct: (result.freightPerUnit / result.landedCost) * 100, color: "#f59e0b" },
                  { label: "Prep", value: result.prep, pct: (result.prep / result.landedCost) * 100, color: "#8b5cf6" },
                  { label: "Producto", value: result.totalCost - result.freightPerUnit - result.prep - result.photoPerUnit, pct: ((result.totalCost - result.freightPerUnit - result.prep - result.photoPerUnit) / result.landedCost) * 100, color: "#3b82f6" },
                  ...(result.photoPerUnit > 0 ? [{ label: "Fotos", value: result.photoPerUnit, pct: (result.photoPerUnit / result.landedCost) * 100, color: "#ec4899" }] : []),
                  ...(result.ppcPerUnit > 0 ? [{ label: "PPC", value: result.ppcPerUnit, pct: (result.ppcPerUnit / result.landedCost) * 100, color: "#06b6d4" }] : []),
                  ...(result.other > 0 ? [{ label: "Otros", value: result.other, pct: (result.other / result.landedCost) * 100, color: "#64748b" }] : []),
                ].filter((i) => i.value > 0).map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-foreground">{fmt(item.value)}</span>
                      <span className="text-[10px] text-muted-foreground w-8 text-right">{item.pct.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between items-center">
                  <span className="text-xs font-medium text-foreground">Total Landed</span>
                  <span className="font-display font-bold text-foreground">{fmt(result.landedCost)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scenarios */}
      {result && (
        <DataTableWrapper title="Comparación por Escenario" icon={Scale}>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ScenarioCard title="Pesimista" subtitle="-15% precio, -40% vol" result={pessimistic} target={targetRoiNum} color="red" />
              <ScenarioCard title="Realista" subtitle="Datos actuales" result={result} target={targetRoiNum} color="cyan" highlight />
              <ScenarioCard title="Optimista" subtitle="+15% precio, +40% vol" result={optimistic} target={targetRoiNum} color="green" />
            </div>
          </div>
        </DataTableWrapper>
      )}

      {/* Save */}
      {result && (
        <div className="flex justify-end">
          <button onClick={handleSave} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm">
            <Save className="h-4 w-4" /> Guardar análisis
          </button>
        </div>
      )}

      {!result && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Calculator className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Ingresá precio de venta y costo para calcular</p>
        </div>
      )}
    </div>
  );
}

function ScenarioCard({ title, subtitle, result, target, color, highlight }: {
  title: string; subtitle: string; result: ReturnType<typeof calculate>; target: number; color: "red" | "cyan" | "green"; highlight?: boolean;
}) {
  const map = {
    red: { border: "border-rose-500/20", bg: "bg-rose-500/5", text: "text-red-600 dark:text-rose-400", badge: "bg-rose-500/10 text-red-600 dark:text-rose-400 border-rose-500/20" },
    cyan: { border: "border-cyan-500/20", bg: "bg-cyan-500/5", text: "text-blue-600 dark:text-cyan-400", badge: "bg-cyan-500/10 text-blue-600 dark:text-cyan-400 border-cyan-500/20" },
    green: { border: "border-emerald-500/20", bg: "bg-emerald-500/5", text: "text-green-600 dark:text-emerald-400", badge: "bg-emerald-500/10 text-green-600 dark:text-emerald-400 border-emerald-500/20" },
  };
  const c = map[color];
  return (
    <div className={cn("rounded-xl border p-4 space-y-3", highlight ? "border-cyan-500/30 bg-cyan-500/[0.03]" : `${c.border} ${c.bg}`)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
        {result && (
          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", c.badge)}>
            {result.roi >= target ? "Viable" : "Revisar"}
          </span>
        )}
      </div>
      {result ? (
        <div className="space-y-2">
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Ganancia</span><span className={cn("font-display font-semibold", result.netProfit >= 0 ? c.text : "text-red-600 dark:text-rose-400")}>{fmt(result.netProfit)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">ROI</span><span className={cn("font-display font-bold", c.text)}>{fmtPct(result.roi)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Margen</span><span className="font-display text-foreground">{fmtPct(result.margin)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Landed</span><span className="font-display text-foreground">{fmt(result.landedCost)}</span></div>
        </div>
      ) : <p className="text-xs text-muted-foreground">Sin datos</p>}
    </div>
  );
}
