"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Search, Grid3X3, LayoutGrid } from "lucide-react";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  sale_price: number | null;
  net_profit: number | null;
  roi: number | null;
  status: string;
  stock_available: number | null;
  sales_velocity_30d: number | null;
}

interface HeatmapProps {
  products: Product[];
}

function getHeatBg(value: number, maxValue: number): string {
  if (maxValue === 0) return "bg-muted/30";
  const ratio = Math.min(value / maxValue, 1);
  if (ratio < 0.15) return "bg-red-500/5";
  if (ratio < 0.3) return "bg-red-500/10";
  if (ratio < 0.45) return "bg-amber-500/10";
  if (ratio < 0.6) return "bg-amber-500/20";
  if (ratio < 0.75) return "bg-lime-500/20";
  if (ratio < 0.9) return "bg-lime-500/30";
  return "bg-green-500/30";
}

function getHeatTextColor(value: number, maxValue: number): string {
  if (maxValue === 0) return "text-muted-foreground";
  const ratio = value / maxValue;
  if (ratio < 0.25) return "text-red-600 dark:text-red-400";
  if (ratio < 0.5) return "text-amber-600 dark:text-amber-400";
  if (ratio < 0.75) return "text-lime-600 dark:text-lime-400";
  return "text-green-600 dark:text-green-400";
}

function getProfitBg(profit: number): string {
  if (profit <= 0) return "bg-red-500/10";
  if (profit < 5) return "bg-amber-500/10";
  if (profit < 15) return "bg-lime-500/20";
  return "bg-green-500/20";
}

function getProfitTextColor(profit: number): string {
  if (profit <= 0) return "text-red-600 dark:text-red-400";
  if (profit < 5) return "text-amber-600 dark:text-amber-400";
  if (profit < 15) return "text-lime-600 dark:text-lime-400";
  return "text-green-600 dark:text-green-400";
}

export function ProfitabilityHeatmap({ products }: HeatmapProps) {
  const { locale } = useLocale();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"roi" | "profit" | "name" | "sales">("roi");
  const [groupBy, setGroupBy] = useState<"none" | "category">("category");
  const [viewMode, setViewMode] = useState<"cards" | "matrix">("cards");

  const activeProducts = useMemo(() => {
    let filtered = products.filter((p) => p.status === "active" && (p.roi !== null || p.net_profit !== null));
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    filtered.sort((a, b) => {
      if (sortBy === "roi") return (b.roi || 0) - (a.roi || 0);
      if (sortBy === "profit") return (b.net_profit || 0) - (a.net_profit || 0);
      if (sortBy === "sales") return (b.sales_velocity_30d || 0) - (a.sales_velocity_30d || 0);
      return a.name.localeCompare(b.name);
    });
    return filtered;
  }, [products, search, sortBy]);

  const maxRoi = useMemo(() => Math.max(...activeProducts.map((p) => p.roi || 0), 1), [activeProducts]);

  const maxProfit = useMemo(() => Math.max(...activeProducts.map((p) => p.net_profit || 0), 1), [activeProducts]);

  const grouped = useMemo(() => {
    if (groupBy !== "category") return null;
    const groups: Record<string, Product[]> = {};
    for (const p of activeProducts) {
      const cat = p.category || t("analytics.no_category", locale);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [activeProducts, groupBy, locale]);

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        {t("analytics.no_active_products", locale)}
      </div>
    );
  }

  const renderProductGrid = (items: Product[]) => {
    if (viewMode === "matrix") {
      return (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="text-start text-xs font-medium text-muted-foreground p-2">{t("common.product", locale)}</th>
                <th scope="col" className="text-end text-xs font-medium text-muted-foreground p-2">{t("common.roi", locale)}</th>
                <th scope="col" className="text-end text-xs font-medium text-muted-foreground p-2">{t("common.profit", locale)}</th>
                <th scope="col" className="text-end text-xs font-medium text-muted-foreground p-2 hidden sm:table-cell">{t("analytics.sales_per_month", locale)}</th>
                <th scope="col" className="text-end text-xs font-medium text-muted-foreground p-2 hidden md:table-cell">{t("common.stock", locale)}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border/30 hover:brightness-110 transition-all"
                  style={{
                    backgroundColor: `color-mix(in srgb, hsl(var(--background)), hsl(var(--primary)) ${
                      ((p.roi || 0) / maxRoi) * 8
                    }%)`,
                  }}
                >
                  <td className="p-2">
                    <p className="text-xs font-medium text-foreground truncate max-w-[160px]">{p.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{p.sku}</p>
                  </td>
                  <td className="p-2 text-end">
                    <span className={cn(
                      "inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold min-w-[52px]",
                      getHeatBg(p.roi || 0, maxRoi),
                      getHeatTextColor(p.roi || 0, maxRoi)
                    )}>
                      {(p.roi || 0).toFixed(0)}%
                    </span>
                  </td>
                  <td className="p-2 text-end">
                    <span className={cn(
                      "inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold min-w-[60px]",
                      getProfitBg(p.net_profit || 0),
                      getProfitTextColor(p.net_profit || 0)
                    )}>
                      ${(p.net_profit || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="p-2 text-end text-xs text-muted-foreground hidden sm:table-cell">
                    {p.sales_velocity_30d ?? "—"}
                  </td>
                  <td className="p-2 text-end text-xs text-muted-foreground hidden md:table-cell">
                    {p.stock_available ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {items.map((p) => (
          <div
            key={p.id}
            className={cn(
              "rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-all",
              getHeatBg(p.roi || 0, maxRoi).replace("bg-", "hover:bg-").replace(/\/\d+/, "/15")
            )}
          >
            <p className="text-xs font-medium text-foreground truncate mb-1" title={p.name}>
              {p.name}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground mb-2 truncate">
              {p.sku}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={cn(
                "inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold",
                getHeatBg(p.roi || 0, maxRoi),
                getHeatTextColor(p.roi || 0, maxRoi)
              )}>
                {(p.roi || 0).toFixed(0)}%
              </span>
              <span className={cn(
                "inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold",
                getProfitBg(p.net_profit || 0),
                getProfitTextColor(p.net_profit || 0)
              )}>
                ${(p.net_profit || 0).toFixed(2)}
              </span>
            </div>
            {p.sales_velocity_30d != null && (
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {p.sales_velocity_30d} {t("analytics.sales_per_month", locale)}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (groupBy === "category" && grouped) {
      return (
        <div className="space-y-6">
          {grouped.map(([category, items]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {category}
                <span className="ms-2 font-normal text-muted-foreground/70">
                  ({items.length})
                </span>
              </h4>
              {renderProductGrid(items)}
            </div>
          ))}
        </div>
      );
    }
    return renderProductGrid(activeProducts);
  };

  return (
    <div className="w-full space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-[240px]">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("analytics.search_sku_or_name", locale)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 ps-8 pe-3 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="h-8 px-2 rounded-lg border border-border bg-popover text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="roi">{t("analytics.sort_by_roi", locale)}</option>
          <option value="profit">{t("analytics.sort_by_profit", locale)}</option>
          <option value="name">{t("analytics.sort_by_name", locale)}</option>
          <option value="sales">{t("analytics.sort_by_sales", locale)}</option>
        </select>
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
          className="h-8 px-2 rounded-lg border border-border bg-popover text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="category">{t("analytics.group_by_category", locale)}</option>
          <option value="none">{t("analytics.ungrouped", locale)}</option>
        </select>
        <div className="flex items-center rounded-lg border border-border bg-popover p-0.5">
          <button
            onClick={() => setViewMode("cards")}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === "cards" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
            title={t("analytics.view_cards", locale)}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode("matrix")}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === "matrix" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
            title={t("analytics.view_matrix", locale)}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          {activeProducts.length} {t("analytics.product_count", locale)}
        </span>
      </div>

      {/* Content */}
      {renderContent()}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground">
        <span>{t("common.roi", locale)}:</span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500/15" /> {t("analytics.legend_low", locale)}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-500/15" /> {t("analytics.legend_medium", locale)}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-lime-500/25" /> {t("analytics.legend_good", locale)}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500/30" /> {t("analytics.legend_excellent", locale)}
        </span>
      </div>
    </div>
  );
}
