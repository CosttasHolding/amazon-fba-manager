"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { PaginationControl } from "@/components/ui/pagination-control";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { TrendingUp, AlertTriangle, Package, Clock } from "lucide-react";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

interface Forecast {
  product_id: string;
  sku: string;
  name: string;
  stock_available: number;
  sales_velocity_30d: number;
  daily_velocity: number;
  days_of_stock: number;
  lead_time_days: number;
  reorder_point: number;
  suggested_qty: number;
  supplier_name: string | null;
  urgency: "critical" | "warning" | "ok";
}

export function ForecastingClient({
  initialForecasts,
}: {
  initialForecasts: Forecast[];
}) {
  const { locale } = useLocale();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE;

  const critical = initialForecasts.filter((f) => f.urgency === "critical");
  const warning = initialForecasts.filter((f) => f.urgency === "warning");

  const paginatedForecasts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return initialForecasts.slice(start, start + ITEMS_PER_PAGE);
  }, [initialForecasts, currentPage, ITEMS_PER_PAGE]);

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge={t("badge.forecasting", locale)}
        title={t("forecasting.title", locale)}
        subtitle={t("forecasting.subtitle", locale)}
        breadcrumbs={[{ label: t("nav.dashboard", locale), href: "/dashboard" }, { label: t("nav.forecasting", locale) }]}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/10 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-[10px] uppercase tracking-wider text-red-700 dark:text-red-300">{t("forecasting.critical", locale)}</span>
          </div>
          <p className="text-2xl font-display font-bold text-red-700 dark:text-red-400">{critical.length}</p>
          <p className="text-xs text-red-600/70 dark:text-red-400/70">{t("forecasting.critical_desc", locale)}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/10 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300">{t("forecasting.warning", locale)}</span>
          </div>
          <p className="text-2xl font-display font-bold text-amber-700 dark:text-amber-400">{warning.length}</p>
          <p className="text-xs text-amber-600/70 dark:text-amber-400/70">{t("forecasting.warning_desc", locale)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("forecasting.total_reorder", locale)}</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{initialForecasts.length}</p>
          <p className="text-xs text-muted-foreground">{t("forecasting.total_desc", locale)}</p>
        </div>
      </div>

      <DataTableWrapper title={t("forecasting.title", locale)} icon={TrendingUp}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("common.product", locale)}</th>
                <th scope="col" className="text-end px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("common.stock", locale)}</th>
                <th scope="col" className="text-end px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("forecasting.sales_per_day", locale)}</th>
                <th scope="col" className="text-end px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("inventory.stock_days", locale)}</th>
                <th scope="col" className="text-end px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("forecasting.lead_time", locale)}</th>
                <th scope="col" className="text-end px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("forecasting.suggested", locale)}</th>
                <th scope="col" className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("common.supplier", locale)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginatedForecasts.map((f) => (
                <tr key={f.product_id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{f.name}</p>
                    <p className="text-[10px] text-muted-foreground">{f.sku}</p>
                  </td>
                  <td className="px-4 py-3 text-end font-display">{f.stock_available}</td>
                  <td className="px-4 py-3 text-end font-display text-muted-foreground">{f.daily_velocity}</td>
                  <td className="px-4 py-3 text-end">
                    <span className={`font-display font-bold ${f.days_of_stock <= f.lead_time_days ? "text-red-600 dark:text-red-400" : f.days_of_stock <= f.lead_time_days * 2 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-emerald-400"}`}>
                      {f.days_of_stock}d
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end text-muted-foreground">{f.lead_time_days}d</td>
                  <td className="px-4 py-3 text-end">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold font-display">
                      {f.suggested_qty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{f.supplier_name || "—"}</td>
                </tr>
              ))}
              {initialForecasts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    {t("forecasting.empty_message", locale)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {initialForecasts.length > ITEMS_PER_PAGE && (
          <div className="p-4 border-t border-border">
            <PaginationControl
              currentPage={currentPage}
              totalPages={Math.ceil(initialForecasts.length / ITEMS_PER_PAGE)}
              totalItems={initialForecasts.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </DataTableWrapper>
    </div>
  );
}
