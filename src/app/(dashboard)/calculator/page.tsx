"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fmt, fmtPct } from "@/lib/utils";
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Percent,
  Target,
  Settings2,
  Package,
  Truck,
  Warehouse,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";

function calcRefFee(price: number) {
  return price * 0.15;
}

function calcFBAFee(kg: number) {
  var lb = kg * 2.20462;
  if (lb < 1) return 3.22;
  if (lb < 2) return 4.75;
  if (lb < 3) return 5.40;
  return 5.40 + (lb - 3) * 0.40;
}

var inputClass = "h-9 bg-muted/50 border-border text-sm";
var labelClass = "text-xs text-muted-foreground";

export default function CalculatorPage() {
  var [unitCost, setUnitCost] = useState("");
  var [salePrice, setSalePrice] = useState("");
  var [weightKg, setWeightKg] = useState("1");

  var [showShipping, setShowShipping] = useState(false);
  var [shippingCost, setShippingCost] = useState("");
  var [showPrep, setShowPrep] = useState(false);
  var [prepCost, setPrepCost] = useState("");
  var [showStorage, setShowStorage] = useState(false);
  var [storageFee, setStorageFee] = useState("");
  var [showOtherFees, setShowOtherFees] = useState(false);
  var [otherFees, setOtherFees] = useState("");
  var [showTax, setShowTax] = useState(false);
  var [taxRate, setTaxRate] = useState("0");

  var [targetRoi, setTargetRoi] = useState("30");
  var [usdRate, setUsdRate] = useState("1");
  var [showConfig, setShowConfig] = useState(false);

  var result = useMemo(function() {
    var uc = parseFloat(unitCost) || 0;
    var sp = parseFloat(salePrice) || 0;
    var wk = parseFloat(weightKg) || 1;

    if (uc <= 0 && sp <= 0) return null;

    var refFee = calcRefFee(sp);
    var fbaFee = calcFBAFee(wk);
    var ship = showShipping ? (parseFloat(shippingCost) || 0) : 0;
    var prep = showPrep ? (parseFloat(prepCost) || 0) : 0;
    var storage = showStorage ? (parseFloat(storageFee) || 0) : 0;
    var other = showOtherFees ? (parseFloat(otherFees) || 0) : 0;
    var tax = showTax ? (parseFloat(taxRate) || 0) : 0;

    var totalCost = uc + ship + prep;
    var totalFees = refFee + fbaFee + storage + other;
    var netProfit = sp - totalCost - totalFees;
    var afterTax = tax > 0 ? netProfit * (1 - tax / 100) : netProfit;
    var roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
    var margin = sp > 0 ? (netProfit / sp) * 100 : 0;

    var rate = parseFloat(usdRate) || 1;

    return {
      referralFee: refFee,
      fbaFee: fbaFee,
      shippingCost: ship,
      prepCost: prep,
      storageFee: storage,
      otherFees: other,
      totalCost: totalCost,
      totalFees: totalFees,
      netProfit: netProfit,
      netProfitAfterTax: afterTax,
      roi: roi,
      margin: margin,
      taxAmount: netProfit * (tax / 100),
      taxRate: tax,
      usdRate: rate,
      netProfitLocal: afterTax * rate,
      salePriceLocal: sp * rate,
      unitCostLocal: uc * rate,
    };
  }, [unitCost, salePrice, weightKg, shippingCost, prepCost, storageFee, otherFees, taxRate, usdRate, showShipping, showPrep, showStorage, showOtherFees, showTax]);

  var targetRoiNum = parseFloat(targetRoi) || 30;

  var roiAccent = function(roi: number): "green" | "amber" | "red" {
    if (roi >= targetRoiNum) return "green";
    if (roi >= targetRoiNum / 2) return "amber";
    return "red";
  };

  var roiLabel = function(roi: number) {
    if (roi >= targetRoiNum) return "Supera objetivo";
    if (roi >= targetRoiNum / 2) return "Cerca del objetivo";
    return "Bajo objetivo";
  };

  return (
    <div className="max-w-3xl space-y-6 animate-fade-up">
      <PageHeader
        badge="CALCULADORA"
        title="Calculadora FBA"
        subtitle="Calcula ganancia, ROI y tarifas de Amazon en tiempo real"
      />

      <div className="rounded-2xl border border-border bg-card p-5">
        <button
          type="button"
          onClick={function() { setShowConfig(!showConfig); }}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Configuracion</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {"ROI obj: " + targetRoiNum + "% | USD: " + (parseFloat(usdRate) || 1)}
            </span>
            {showConfig ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>
        {showConfig && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            <div>
              <Label className={labelClass}>ROI Objetivo (%)</Label>
              <Input type="number" value={targetRoi}
                onChange={function(e) { setTargetRoi(e.target.value); }}
                className={inputClass} />
            </div>
            <div>
              <Label className={labelClass}>Tipo cambio USD</Label>
              <Input type="number" step="0.01" value={usdRate}
                onChange={function(e) { setUsdRate(e.target.value); }}
                placeholder="1.00" className={inputClass} />
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">1 USD = X moneda local</p>
            </div>
            <div>
              <Label className={labelClass}>Impuestos (%)</Label>
              <div className="flex items-center gap-2">
                <Switch checked={showTax} onCheckedChange={setShowTax} />
                {showTax && (
                  <Input type="number" step="0.1" value={taxRate}
                    onChange={function(e) { setTaxRate(e.target.value); }}
                    placeholder="0" className={inputClass + " flex-1"} />
                )}
                {!showTax && <span className="text-xs text-muted-foreground">Desactivado</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">
            Datos del Producto
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className={labelClass}>Costo Unitario ($)</Label>
            <Input type="number" step="0.01" placeholder="0.00" value={unitCost}
              onChange={function(e) { setUnitCost(e.target.value); }}
              className={inputClass} />
          </div>
          <div>
            <Label className={labelClass}>Precio de Venta ($)</Label>
            <Input type="number" step="0.01" placeholder="0.00" value={salePrice}
              onChange={function(e) { setSalePrice(e.target.value); }}
              className={inputClass} />
          </div>
          <div>
            <Label className={labelClass}>Peso (kg)</Label>
            <Input type="number" step="0.01" placeholder="1.00" value={weightKg}
              onChange={function(e) { setWeightKg(e.target.value); }}
              className={inputClass} />
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Costos adicionales</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3">
              <Switch checked={showShipping} onCheckedChange={setShowShipping} />
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <Truck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {showShipping ? (
                  <div className="flex-1">
                    <Label className={labelClass}>Envio ($)</Label>
                    <Input type="number" step="0.01" value={shippingCost}
                      onChange={function(e) { setShippingCost(e.target.value); }}
                      placeholder="0.00" className={inputClass} />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Costo de envio</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={showPrep} onCheckedChange={setShowPrep} />
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {showPrep ? (
                  <div className="flex-1">
                    <Label className={labelClass}>Prep ($)</Label>
                    <Input type="number" step="0.01" value={prepCost}
                      onChange={function(e) { setPrepCost(e.target.value); }}
                      placeholder="0.00" className={inputClass} />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Costo de prep</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={showStorage} onCheckedChange={setShowStorage} />
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <Warehouse className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {showStorage ? (
                  <div className="flex-1">
                    <Label className={labelClass}>Almacenamiento ($)</Label>
                    <Input type="number" step="0.01" value={storageFee}
                      onChange={function(e) { setStorageFee(e.target.value); }}
                      placeholder="0.00" className={inputClass} />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Almacenamiento</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={showOtherFees} onCheckedChange={setShowOtherFees} />
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {showOtherFees ? (
                  <div className="flex-1">
                    <Label className={labelClass}>Otros ($)</Label>
                    <Input type="number" step="0.01" value={otherFees}
                      onChange={function(e) { setOtherFees(e.target.value); }}
                      placeholder="0.00" className={inputClass} />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Otras tarifas</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard
              label="Ganancia Neta"
              value={fmt(showTax ? result.netProfitAfterTax : result.netProfit)}
              icon={DollarSign}
              accentColor={result.netProfit >= 0 ? "green" : "red"}
              subtitle={showTax ? "Antes imp.: " + fmt(result.netProfit) : undefined}
              animationDelay={0}
            />
            <KpiCard
              label="ROI"
              value={fmtPct(result.roi)}
              icon={TrendingUp}
              accentColor={roiAccent(result.roi)}
              trend={result.roi >= 0 ? "up" : "down"}
              trendValue={roiLabel(result.roi) + " (" + targetRoiNum + "%)"}
              animationDelay={75}
            />
            <KpiCard
              label="Margen"
              value={fmtPct(result.margin)}
              icon={Percent}
              accentColor="purple"
              animationDelay={150}
            />
          </div>

          {result.usdRate > 1 && (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Moneda local (x{result.usdRate})</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Costo</span>
                  <p className="font-medium text-foreground tabular-nums">{fmt(result.unitCostLocal)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Precio</span>
                  <p className="font-medium text-foreground tabular-nums">{fmt(result.salePriceLocal)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Ganancia</span>
                  <p className={"font-bold tabular-nums " + (result.netProfitLocal >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {fmt(result.netProfitLocal)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <DollarSign className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">
                Desglose de Tarifas
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tarifa Referencia (15%)</span>
                <span className="text-sm font-medium text-foreground/80 tabular-nums">{fmt(result.referralFee)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tarifa FBA</span>
                <span className="text-sm font-medium text-foreground/80 tabular-nums">{fmt(result.fbaFee)}</span>
              </div>
              {showShipping && result.shippingCost > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Envio</span>
                  <span className="text-sm font-medium text-foreground/80 tabular-nums">{fmt(result.shippingCost)}</span>
                </div>
              )}
              {showPrep && result.prepCost > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Preparacion</span>
                  <span className="text-sm font-medium text-foreground/80 tabular-nums">{fmt(result.prepCost)}</span>
                </div>
              )}
              {showStorage && result.storageFee > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Almacenamiento</span>
                  <span className="text-sm font-medium text-foreground/80 tabular-nums">{fmt(result.storageFee)}</span>
                </div>
              )}
              {showOtherFees && result.otherFees > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Otros</span>
                  <span className="text-sm font-medium text-foreground/80 tabular-nums">{fmt(result.otherFees)}</span>
                </div>
              )}
              {showTax && result.taxRate > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{"Impuestos (" + result.taxRate + "%)"}</span>
                  <span className="text-sm font-medium text-foreground/80 tabular-nums">{fmt(result.taxAmount)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground/70">Total Costos + Tarifas</span>
                <span className="text-sm font-bold text-primary tabular-nums">{fmt(result.totalCost + result.totalFees)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!result && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Calculator className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Ingresa costo y precio de venta para ver los resultados</p>
        </div>
      )}
    </div>
  );
}