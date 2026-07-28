"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from "recharts";
import { TrendingUp, AlertTriangle, Package, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

interface SaleData {
  sale_date: string;
  revenue: number | null;
  units_sold: number | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  stock_available: number | null;
  sales_velocity_30d: number | null;
  status: string;
}

interface RevenueProjectionProps {
  salesData?: SaleData[];
  products?: Product[];
}

interface ProjectedPoint {
  date: string;
  actual: number | null;
  projected: number | null;
  upper: number | null;
  lower: number | null;
}

interface StockProjectionRow {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  velocity: number;
  daysUntilStockout: number | null;
  status: "ok" | "warning" | "critical" | "overstock";
}

function linearRegression(data: { x: number; y: number }[]) {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  const sumX = data.reduce((s, d) => s + d.x, 0);
  const sumY = data.reduce((s, d) => s + d.y, 0);
  const sumXY = data.reduce((s, d) => s + d.x * d.y, 0);
  const sumX2 = data.reduce((s, d) => s + d.x * d.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const yMean = sumY / n;
  const ssRes = data.reduce((s, d) => s + (d.y - (slope * d.x + intercept)) ** 2, 0);
  const ssTot = data.reduce((s, d) => s + (d.y - yMean) ** 2, 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

function ProjectionTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover p-3 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-display font-semibold text-foreground">
            ${Number(entry.value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RevenueProjection({ salesData = [], products = [] }: RevenueProjectionProps) {
  const { locale } = useLocale();
  const [period, setPeriod] = useState("30d");

  const PERIODS = useMemo(() => [
    { value: "30d", label: t("analytics.period_30d", locale), days: 30 },
    { value: "60d", label: t("analytics.period_60d", locale), days: 60 },
    { value: "90d", label: t("analytics.period_90d", locale), days: 90 },
  ], [locale]);

  const selectedDays = PERIODS.find((p) => p.value === period)?.days || 30;

  const { chartData, avgDailyRevenue, projectedMonthlyRevenue, activeProducts, modelQuality } = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - selectedDays);

    const filtered = salesData.filter((s) => new Date(s.sale_date) >= cutoff);

    const dailyMap: Record<string, number> = {};
    for (let i = selectedDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyMap[d.toISOString().split("T")[0]] = 0;
    }
    for (const s of filtered) {
      if (dailyMap[s.sale_date] !== undefined) {
        dailyMap[s.sale_date] += s.revenue || 0;
      }
    }

    const dailyRevenues = Object.values(dailyMap);
    const avgDaily = dailyRevenues.reduce((a, b) => a + b, 0) / Math.max(dailyRevenues.length, 1);

    const regressionPoints = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, val], i) => ({ x: i, y: val }));
    const { slope, intercept, r2 } = linearRegression(regressionPoints);

    const residuals = regressionPoints.map((p) => Math.abs(p.y - (slope * p.x + intercept)));
    const sigma = residuals.length > 2
      ? Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / (residuals.length - 2))
      : avgDaily * 0.3;

    const localeDate = locale === "en" ? "en-US" : "es-ES";
    const result: ProjectedPoint[] = [];
    for (let i = selectedDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString(localeDate, { day: "2-digit", month: "short" });
      result.push({
        date: label,
        actual: dailyMap[dateStr] || 0,
        projected: null,
        upper: null,
        lower: null,
      });
    }

    const lastDate = new Date();
    for (let i = 1; i <= selectedDays; i++) {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i);
      const label = d.toLocaleDateString(localeDate, { day: "2-digit", month: "short" });
      const x = selectedDays - 1 + i;
      const projected = Math.max(0, slope * x + intercept);
      result.push({
        date: label,
        actual: null,
        projected: Math.round(projected * 100) / 100,
        upper: Math.round((projected + 1.96 * sigma) * 100) / 100,
        lower: Math.round(Math.max(0, projected - 1.96 * sigma) * 100) / 100,
      });
    }

    const activeProds = (products || []).filter(
      (p) => p.status === "active" && p.sales_velocity_30d != null && p.sales_velocity_30d > 0
    );

    return {
      chartData: result,
      avgDailyRevenue: Math.round(avgDaily * 100) / 100,
      projectedMonthlyRevenue: Math.round(slope > 0 ? (avgDaily + slope * 15) * 30 * 100 / 100 : avgDaily * 30 * 100) / 100,
      activeProducts: activeProds,
      modelQuality: Math.round(r2 * 100),
    };
  }, [salesData, products, selectedDays, locale]);

  const stockProjections: StockProjectionRow[] = useMemo(() => {
    return activeProducts
      .map((p) => {
        const velocity = p.sales_velocity_30d || 0;
        const stock = p.stock_available || 0;
        const dailyVelocity = velocity / 30;
        const days = dailyVelocity > 0 ? Math.floor(stock / dailyVelocity) : null;
        let status: StockProjectionRow["status"] = "ok";
        if (days === null) status = "overstock";
        else if (days <= 15) status = "critical";
        else if (days <= 30) status = "warning";
        else if (days > 90) status = "overstock";
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          currentStock: stock,
          velocity,
          daysUntilStockout: days,
          status,
        };
      })
      .sort((a, b) => {
        const order = { critical: 0, warning: 1, ok: 2, overstock: 3 };
        return (order[a.status] ?? 4) - (order[b.status] ?? 4);
      });
  }, [activeProducts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="h-8 px-2 rounded-lg border border-border bg-popover text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        {modelQuality > 0 && (
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-full font-medium",
            modelQuality >= 70 ? "bg-green-500/10 text-green-500" :
            modelQuality >= 40 ? "bg-amber-500/10 text-amber-500" :
            "bg-red-500/10 text-red-500"
          )}>
            {t("analytics.model_confidence", locale).replace("{quality}", String(modelQuality))}
          </span>
        )}
      </div>

      {/* Revenue Projection Chart */}
      <div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">{t("analytics.avg_daily_revenue", locale)}</p>
            <p className="text-lg font-display font-bold text-foreground">
              ${avgDailyRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">{t("analytics.monthly_projection", locale)}</p>
            <p className="text-lg font-display font-bold text-foreground">
              ${projectedMonthlyRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">{t("analytics.products_analyzed", locale)}</p>
            <p className="text-lg font-display font-bold text-foreground">
              {stockProjections.length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">{t("analytics.period_label", locale)}</p>
            <p className="text-lg font-display font-bold text-foreground">
              {selectedDays}d
            </p>
          </div>
        </div>

        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(192, 100%, 50%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(192, 100%, 50%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(Math.floor(selectedDays / 10), 1)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
              />
              <Tooltip content={<ProjectionTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}
                iconType="circle"
                iconSize={8}
              />
              <Area
                type="monotone"
                dataKey="upper"
                name={t("analytics.legend_confidence_95", locale)}
                stroke="none"
                fill="url(#confidenceGradient)"
                stackId="confidence"
              />
              <Area
                type="monotone"
                dataKey="lower"
                name={t("analytics.legend_confidence_95", locale)}
                stroke="none"
                fill="url(#confidenceGradient)"
                stackId="confidence"
              />
              <Area
                type="monotone"
                dataKey="actual"
                name={t("analytics.legend_actual", locale)}
                stroke="hsl(192, 100%, 50%)"
                strokeWidth={2}
                fill="url(#actualGradient)"
                connectNulls={false}
                animationDuration={800}
              />
              <Area
                type="monotone"
                dataKey="projected"
                name={t("analytics.legend_projected", locale)}
                stroke="hsl(142, 71%, 45%)"
                strokeWidth={2}
                strokeDasharray="6 3"
                fill="url(#projectedGradient)"
                connectNulls={false}
                animationDuration={800}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-3 h-0.5 rounded-full bg-[hsl(192,100%,50%)]" />
            {t("analytics.legend_actual", locale)} ({selectedDays}d)
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-3 h-0.5 rounded bg-[hsl(142,71%,45%)]" style={{ height: 2, width: 12, backgroundImage: "repeating-linear-gradient(90deg, hsl(142,71%,45%) 0, hsl(142,71%,45%) 4px, transparent 4px, transparent 6px)" }} />
            {t("analytics.legend_projected", locale)} ({selectedDays}d)
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-sm bg-[hsl(142,71%,45%)] opacity-10 border border-[hsl(142,71%,45%)] opacity-30" />
            {t("analytics.legend_confidence_95", locale)}
          </span>
        </div>
      </div>

      {/* Stock Projections Table */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          {t("analytics.stock_projection_title", locale)}
        </h4>
        {stockProjections.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {t("analytics.no_stock_data", locale)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="text-start text-xs font-medium text-muted-foreground px-4 py-3">{t("common.product", locale)}</th>
                  <th scope="col" className="text-end text-xs font-medium text-muted-foreground px-4 py-3">{t("analytics.stock_actual", locale)}</th>
                  <th scope="col" className="text-end text-xs font-medium text-muted-foreground px-4 py-3">{t("analytics.velocity_units_month", locale)}</th>
                  <th scope="col" className="text-end text-xs font-medium text-muted-foreground px-4 py-3">{t("analytics.days_remaining", locale)}</th>
                  <th scope="col" className="text-center text-xs font-medium text-muted-foreground px-4 py-3">{t("common.status", locale)}</th>
                </tr>
              </thead>
              <tbody>
                {stockProjections.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{row.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{row.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-end text-sm font-display text-foreground">{row.currentStock}</td>
                    <td className="px-4 py-3 text-end text-sm font-display text-foreground">{row.velocity.toFixed(1)}</td>
                    <td className="px-4 py-3 text-end">
                      <span className={cn(
                        "text-sm font-display font-semibold",
                        row.daysUntilStockout === null ? "text-muted-foreground" :
                        row.daysUntilStockout <= 15 ? "text-red-500" :
                        row.daysUntilStockout <= 30 ? "text-amber-500" : "text-green-500"
                      )}>
                        {row.daysUntilStockout === null ? "∞" : row.daysUntilStockout}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.status === "critical" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                          <AlertTriangle className="w-3 h-3" /> {t("analytics.status_critical", locale)}
                        </span>
                      ) : row.status === "warning" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" /> {t("analytics.status_warning", locale)}
                        </span>
                      ) : row.status === "overstock" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          {t("analytics.status_excess", locale)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
