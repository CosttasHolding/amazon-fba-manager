"use client";

import { useMemo } from "react";
import { calcFBAFee, calcRefFee, calcMetrics } from "@/lib/calculations";
import { fmt, fmtPct, cn } from "@/lib/utils";
import { Calculator, TrendingUp, DollarSign } from "lucide-react";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

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
  const { locale } = useLocale();

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
        <Calculator className="h-5 w-5 text-muted-foreground/70 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">
          {t("calculator.enter_price_cost_hint", locale)}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Calculator className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("calculator.auto_fee_calculation", locale)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{t("calculator.fba_fee_label", locale)}</span>
          <span className="font-display text-foreground">{fmt(metrics.fbaFee)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{t("calculator.referral_fee_label", locale)}</span>
          <span className="font-display text-foreground">{fmt(metrics.refFee)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-[9px] text-muted-foreground uppercase">{t("calculator.profit_label", locale)}</p>
          <p className={cn("font-display text-sm font-bold", metrics.netProfit >= 0 ? "text-emerald-500" : "text-rose-500")}>
            {fmt(metrics.netProfit)}
          </p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-[9px] text-muted-foreground uppercase">{t("common.roi", locale)}</p>
          <p className={cn("font-display text-sm font-bold", metrics.roi >= 30 ? "text-emerald-500" : metrics.roi >= 15 ? "text-amber-500" : "text-rose-500")}>
            {fmtPct(metrics.roi)}
          </p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-[9px] text-muted-foreground uppercase">{t("calculator.margin", locale)}</p>
          <p className="font-display text-sm font-bold text-foreground">{fmtPct(metrics.margin)}</p>
        </div>
      </div>
    </div>
  );
}
