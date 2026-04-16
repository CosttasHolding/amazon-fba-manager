"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmt, fmtPct } from "@/lib/utils";
import { Calculator, DollarSign, TrendingUp, Percent, Target, Loader2 } from "lucide-react";

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

  const roiColorClass = (roi: number) =>
    roi >= targetRoi
      ? "text-[hsl(var(--metric-green))]"
      : roi >= targetRoi / 2
      ? "text-amber-500"
      : "text-red-500";

  const profitColorClass = (p: number) =>
    p > 0 ? "text-[hsl(var(--metric-green))]" : "text-red-500";

  const getRoiBadge = (roi: number) => {
    if (roi >= targetRoi) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          Supera objetivo ({targetRoi}%)
        </Badge>
      );
    }
    if (roi >= targetRoi / 2) {
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
          Cerca del objetivo ({targetRoi}%)
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
        Bajo objetivo ({targetRoi}%)
      </Badge>
    );
  };

  const applyTax = (amount: number) => {
    if (taxRate <= 0) return amount;
    return amount * (1 - taxRate / 100);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Calculadora FBA</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Calcula ganancia, ROI y tarifas de Amazon
        </p>
        {!loadingDefaults && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              <Target className="h-3 w-3 mr-1" />
              ROI objetivo: {targetRoi}%
            </Badge>
            <Badge variant="outline" className="text-xs">
              {currency}
            </Badge>
            {taxRate > 0 && (
              <Badge variant="outline" className="text-xs">
                Tax: {taxRate}%
              </Badge>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Datos del Producto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Costo Unitario</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Precio de Venta</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Peso (kg)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="1.00"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <Button onClick={calculate} disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Calculator className="w-4 h-4 mr-2" />
            )}
            {loading ? "Calculando..." : "Calcular"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--metric-green-bg))] flex items-center justify-center mx-auto mb-2">
                  <DollarSign className="w-5 h-5 text-[hsl(var(--metric-green))]" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Ganancia Neta
                </p>
                <p className={`text-2xl font-bold mt-1 ${profitColorClass(result.netProfit)}`}>
                  {fmt(taxRate > 0 ? applyTax(result.netProfit) : result.netProfit)}
                </p>
                {taxRate > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Antes de imp.: {fmt(result.netProfit)}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--metric-blue-bg))] flex items-center justify-center mx-auto mb-2">
                  <TrendingUp className="w-5 h-5 text-[hsl(var(--metric-blue))]" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">ROI</p>
                <p className={`text-2xl font-bold mt-1 ${roiColorClass(result.roi)}`}>
                  {fmtPct(result.roi)}
                </p>
                <div className="mt-2">{getRoiBadge(result.roi)}</div>
              </CardContent>
            </Card>
            <Card className="col-span-2 md:col-span-1">
              <CardContent className="pt-6 text-center">
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--metric-purple-bg))] flex items-center justify-center mx-auto mb-2">
                  <Percent className="w-5 h-5 text-[hsl(var(--metric-purple))]" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Margen</p>
                <p className="text-2xl font-bold mt-1 text-[hsl(var(--metric-purple))]">
                  {(parseFloat(salePrice) || 0) > 0
                    ? fmtPct((result.netProfit / parseFloat(salePrice)) * 100)
                    : "0.0%"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Desglose de Tarifas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Tarifa Referencia (15%)", result.referralFee],
                ["Tarifa FBA", result.fbaFee],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between">
                  <span className="text-muted-foreground">{label as string}</span>
                  <span className="font-medium text-foreground">{fmt(value as number)}</span>
                </div>
              ))}
              {taxRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Impuestos ({taxRate}%)</span>
                  <span className="font-medium text-foreground">
                    {fmt(result.netProfit * (taxRate / 100))}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-3">
                <span className="font-semibold text-foreground">Total Tarifas</span>
                <span className="font-bold text-foreground">{fmt(result.totalFees)}</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}