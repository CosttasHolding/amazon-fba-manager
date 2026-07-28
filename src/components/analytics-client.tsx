"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { ProfitabilityHeatmap } from "@/components/charts/profitability-heatmap";
import { RevenueProjection } from "@/components/charts/revenue-projection";
import { ReportGenerator } from "@/components/charts/report-generator";
import { useProducts, useSales } from "@/hooks/use-data";
import { BarChart3, TrendingUp, FileText, Link2, Calendar } from "lucide-react";
import { ShareDashboard } from "@/components/share-dashboard";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

const ComparisonChart = dynamic(() => import("@/components/charts/comparison-chart").then((m) => m.ComparisonChart), {
  loading: () => <div className="h-[280px] rounded-xl bg-muted/30 animate-pulse" />,
});

type Tab = "heatmap" | "comparison" | "projections" | "reports";

const PERIOD_OPTIONS = [
  { value: "7d", key: "analytics.period_7d" },
  { value: "30d", key: "analytics.period_30d" },
  { value: "60d", key: "analytics.period_60d" },
  { value: "90d", key: "analytics.period_90d" },
];

const TYPE_OPTIONS = [
  { value: "daily", key: "analytics.type_daily" },
  { value: "weekly", key: "analytics.type_weekly" },
  { value: "monthly", key: "analytics.type_monthly" },
];

export function AnalyticsClient() {
  const { locale } = useLocale();
  const { products, isLoading: productsLoading } = useProducts();
  const { sales, isLoading: salesLoading } = useSales();
  const [activeTab, setActiveTab] = useState<Tab>("heatmap");
  const [period, setPeriod] = useState("30d");
  const [chartType, setChartType] = useState("daily");

  const { data: comparisonData, isLoading: comparisonLoading } = useSWR(
    activeTab === "comparison" ? `/api/analytics/comparison?period=${period}&type=${chartType}&locale=${locale}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const tabs: { id: Tab; key: string; icon: typeof BarChart3 }[] = [
    { id: "heatmap", key: "analytics.heatmap", icon: BarChart3 },
    { id: "comparison", key: "analytics.comparison", icon: TrendingUp },
    { id: "projections", key: "analytics.projections", icon: TrendingUp },
    { id: "reports", key: "analytics.reports", icon: FileText },
  ];

  const activeProducts = useMemo(
    () => (products || []).filter((p) => p.status === "active"),
    [products]
  );

  if (productsLoading && salesLoading) {
    return <PageSkeleton kpiCount={3} rowCount={4} showCharts showSearch={false} />;
  }

  return (
    <div>
      <PageHeader
        badge={t("analytics.badge", locale)}
        title={t("analytics.title", locale)}
        subtitle={t("analytics.subtitle", locale)}
        breadcrumbs={[{ label: "Analytics" }]}
      />

      <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-muted/50 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {t(tab.key, locale)}
          </button>
        ))}
      </div>

      {activeTab === "heatmap" && (
        <div>
          <DataTableWrapper title={t("analytics.heatmap_title", locale)} icon={BarChart3}>
            <div className="p-4">
              <ProfitabilityHeatmap products={activeProducts as any[]} />
            </div>
          </DataTableWrapper>
        </div>
      )}

      {activeTab === "comparison" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="h-8 px-2 rounded-lg border border-border bg-popover text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{t(opt.key, locale)}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="h-8 px-2 rounded-lg border border-border bg-popover text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{t(opt.key, locale)}</option>
                ))}
              </select>
            </div>
          </div>
          {comparisonLoading ? (
            <div className="h-[280px] rounded-xl bg-muted/30 animate-pulse" />
          ) : comparisonData ? (
            <ComparisonChart data={comparisonData as any} />
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t("analytics.no_data_period", locale)}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "projections" && (
        <div>
          <DataTableWrapper title={t("analytics.projections_title", locale)} icon={TrendingUp}>
            <div className="p-4">
              <RevenueProjection
                salesData={sales as any[]}
                products={activeProducts as any[]}
              />
            </div>
          </DataTableWrapper>
        </div>
      )}

      {activeTab === "reports" && (
        <div>
          <DataTableWrapper title={t("analytics.reports_title", locale)} icon={FileText}>
            <div className="p-4">
              <ReportGenerator
                products={activeProducts as any[]}
                sales={sales as any[]}
              />
            </div>
          </DataTableWrapper>
        </div>
      )}

      <div className="mt-8">
        <DataTableWrapper title={t("share.title", locale)} icon={Link2}>
          <div className="p-4">
            <ShareDashboard />
          </div>
        </DataTableWrapper>
      </div>
    </div>
  );
}
