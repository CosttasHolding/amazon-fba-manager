"use client";

import { useMemo } from "react";
import { calcFBAFee, calcRefFee, calcMetrics } from "@/lib/calculations";
import { fmt, fmtPct, cn } from "@/lib/utils";
import { Calculator, TrendingUp, DollarSign } from "lucide-react";

interface FeeCalculatorInlineProps {
  unitCost: number;
  shippingCost: number;
  prepCost: number;
  taxes: number;
  salePrice: number;
  weightKg: number;
  storageFeeMonthly: number;
  otherFees: number;
  className?: string;
}

export function FeeCalculatorInline({
  unitCost,
  shippingCost,
  prepCost,
  taxes,
  salePrice,
  weightKg,
  storageFeeMonthly,
  otherFees,
  className,
}: FeeCalculatorInlineProps) {
  const metrics = useMemo(() => {
    const fbaFee = calcFBAFee(weightKg || 0);
    const refFee = calcRefFee(salePrice || 0);
    return {
      fbaFee,
      refFee,
      ...calcMetrics(
        unitCost || 0,
        shippingCost || 0,
        prepCost || 0,
        taxes || 0,
        salePrice || 0,
        refFee,
        fbaFee,
        storageFeeMonthly || 0,
        otherFees || 0
      ),
    };
  }, [unitCost, shippingCost, prepCost, taxes, salePrice, weightKg, storageFeeMonthly, otherFees]);

  const hasData = salePrice > 0 && unitCost > 0;

  if (!hasData) {
    return (
      <div className={cn("rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center", className)}>
        <Calculator className="h-5 w-5 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">
          Ingresa precio de venta y costo para ver el calculo automatico de fees y rentabilidad
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Calculator className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Calculo Automatico de Fees
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">FBA Fee (auto)</span>
          <span className="font-display text-foreground">{fmt(metrics.fbaFee)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Referral (15%)</span>
          <span className="font-display text-foreground">{fmt(metrics.refFee)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-[9px] text-muted-foreground uppercase">Ganancia</p>
          <p className={cn("font-display text-sm font-bold", metrics.netProfit >= 0 ? "text-emerald-500" : "text-rose-500")}>
            {fmt(metrics.netProfit)}
          </p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-[9px] text-muted-foreground uppercase">ROI</p>
          <p className={cn("font-display text-sm font-bold", metrics.roi >= 30 ? "text-emerald-500" : metrics.roi >= 15 ? "text-amber-500" : "text-rose-500")}>
            {fmtPct(metrics.roi)}
          </p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-[9px] text-muted-foreground uppercase">Margen</p>
          <p className="font-display text-sm font-bold text-foreground">{fmtPct(metrics.margin)}</p>
        </div>
      </div>
    </div>
  );
}
