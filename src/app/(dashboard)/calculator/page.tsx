"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmt, fmtPct } from "@/lib/utils";
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Percent,
  Target,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";

export default function CalculatorPage() {
  const [unitCost, setUnitCost] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [targetRoi, setTargetRoi] = useState(30);
  const [currency, setCurrency] = useState("USD");
  const [taxRate, setTaxRate] = useState(0);
  const [loadingDefaults, setLoadingDefaults] = useState(true);

  useEffect(() => {
    fetchDefaults();
  }, []);

  const fetchDefaults = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.target_roi) setTargetRoi(Number(data.target_roi));
        if (data.currency) setCurrency(data.currency);
        if (data.tax_rate) setTaxRate(Number(data.tax_rate));
      }
    } catch (error) {
      console.error("Error loading defaults:", error);
    } finally {
      setLoadingDefaults(false);
    }
  };

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitCost: parseFloat(unitCost) || 0,
          salePrice: parseFloat(salePrice) || 0,
          weightKg: parseFloat(weightKg) || 1,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const applyTax = (amount: number) => {
    if (taxRate <= 0) return amount;
    return amount * (1 - taxRate / 100);
  };

  const roiAccent = (roi: number): "green" | "amber" | "red" => {
    if (roi >= targetRoi) return "green";
    if (roi >= targetRoi / 2) return "amber";
    return "red";
  };

  const roiLabel = (roi: number) => {
    if (roi >= targetRoi) return "Supera objetivo";
    if (roi >= targetRoi / 2) return "Cerca del objetivo";
    return "Bajo objetivo";
  };

  const margin =
    (parseFloat(salePrice) || 0) > 0 && result
      ? (result.netProfit / parseFloat(salePrice)) * 100
      : 0;

  const inputClass = "bg-white/[0.04] border-white/[0.08]";
  const labelClass = "text-sm text-white/50";

  return (
    <div className="max-w-2xl space-y-6 animate-fade-up">
      {/* Header */}
      <PageHeader
        badge="CALCULADORA"
        title="Calculadora FBA"
        subtitle="Calcula ganancia, ROI y tarifas de Amazon"
      />

      {/* Settings badges */}
      {!loadingDefaults && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-400">
            <Target className="h-3 w-3" />
            ROI objetivo: {targetRoi}%
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/40">
            {currency}
          </span>
          {taxRate > 0 && (
            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/40">
              Tax: {taxRate}%
            </span>
          )}
        </div>
      )}

      {/* Input Form */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
            Datos del Producto
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className={labelClass}>Costo Unitario</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <Label className={labelClass}>Precio de Venta</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <Label className={labelClass}>Peso (kg)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="1.00"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <button
          onClick={calculate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors disabled:opacity-50 w-full sm:w-auto justify-center"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Calculator className="h-4 w-4" />
          )}
          {loading ? "Calculando..." : "Calcular"}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard
              label="Ganancia Neta"
              value={fmt(taxRate > 0 ? applyTax(result.netProfit) : result.netProfit)}
              icon={DollarSign}
              accentColor={result.netProfit >= 0 ? "green" : "red"}
              subtitle={taxRate > 0 ? `Antes de imp.: ${fmt(result.netProfit)}` : undefined}
              animationDelay={0}
            />
            <KpiCard
              label="ROI"
              value={fmtPct(result.roi)}
              icon={TrendingUp}
              accentColor={roiAccent(result.roi)}
              trend={result.roi >= 0 ? "up" : "down"}
              trendValue={`${roiLabel(result.roi)} (${targetRoi}%)`}
              animationDelay={75}
            />
            <div className="col-span-2 md:col-span-1">
              <KpiCard
                label="Margen"
                value={fmtPct(margin)}
                icon={Percent}
                accentColor="purple"
                animationDelay={150}
              />
            </div>
          </div>

          {/* Fee Breakdown */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="flex items-center gap-2 mb-5">
              <DollarSign className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                Desglose de Tarifas
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/40">Tarifa Referencia (15%)</span>
                <span className="text-sm font-medium text-white/80 tabular-nums">
                  {fmt(result.referralFee)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/40">Tarifa FBA</span>
                <span className="text-sm font-medium text-white/80 tabular-nums">
                  {fmt(result.fbaFee)}
                </span>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/40">Impuestos ({taxRate}%)</span>
                  <span className="text-sm font-medium text-white/80 tabular-nums">
                    {fmt(result.netProfit * (taxRate / 100))}
                  </span>
                </div>
              )}
              <div className="border-t border-white/[0.06] pt-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-white/70">Total Tarifas</span>
                <span className="text-sm font-bold text-cyan-400 tabular-nums">
                  {fmt(result.totalFees)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}