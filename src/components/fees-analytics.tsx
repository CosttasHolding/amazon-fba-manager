"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  AlertCircle,
  Calendar,
  CircleDollarSign,
  Receipt,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MARKETPLACES } from "@/lib/constants";
import { fetcher } from "@/lib/fetcher";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { Button } from "@/components/ui/button";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { KpiCard } from "@/components/ui/kpi-card";
import { toast } from "sonner";

type FeesPeriod = "30d" | "60d" | "90d";

interface FeesData {
  summary: {
    totalFees: number | null;
    transactionCount: number;
    currency: string | null;
  };
  byFeeType: Array<{
    feeType: string;
    currency: string;
    amount: number;
    count: number;
  }>;
  byDate: Array<{
    date: string;
    currency: string;
    amount: number;
  }>;
}

interface FeesResponse {
  data: FeesData;
}

function dateDaysBefore(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function formatAmount(value: number | null, currency: string | null, locale: string, mixedLabel: string): string {
  if (value === null || currency === "mixed") return mixedLabel;
  if (!currency) return value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
  } catch {
    return `${value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  }
}

export function FeesAnalytics() {
  const { locale } = useLocale();
  const [period, setPeriod] = useState<FeesPeriod>("30d");
  const [marketplace, setMarketplace] = useState("");

  const feesUrl = useMemo(() => {
    const endDate = new Date().toISOString().slice(0, 10);
    const params = new URLSearchParams({
      startDate: dateDaysBefore(endDate, Number(period.slice(0, -1)) - 1),
      endDate,
    });
    if (marketplace) params.set("marketplace", marketplace);
    return `/api/analytics/fees?${params.toString()}`;
  }, [marketplace, period]);

  const {
    data: feesResponse,
    error: feesError,
    isLoading,
    mutate,
  } = useSWR<FeesResponse>(feesUrl, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  useEffect(() => {
    if (feesError) toast.error(t("analytics.fees_error", locale));
  }, [feesError, locale]);

  const fees = feesResponse?.data;
  const mixedLabel = t("analytics.fees_mixed_currency", locale);
  const compositionTotals = new Map<string, number>();
  for (const item of fees?.byFeeType || []) {
    compositionTotals.set(item.currency, (compositionTotals.get(item.currency) || 0) + Math.abs(item.amount));
  }
  const chartCurrencies = Array.from(new Set(fees?.byDate.map((item) => item.currency) || []));
  const chartData = Array.from(new Set(fees?.byDate.map((item) => item.date) || [])).map((date) => {
    const row: Record<string, string | number> = { date };
    for (const item of fees?.byDate.filter((entry) => entry.date === date) || []) row[item.currency] = item.amount;
    return row;
  });

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <div className="flex flex-wrap gap-3">
          <div className="h-8 w-28 rounded-lg bg-muted/40 animate-pulse" />
          <div className="h-8 w-36 rounded-lg bg-muted/40 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-36 rounded-2xl bg-muted/30 animate-pulse" />
          <div className="h-36 rounded-2xl bg-muted/30 animate-pulse" />
        </div>
        <div className="h-64 rounded-2xl bg-muted/30 animate-pulse" />
      </div>
    );
  }

  if (feesError) {
    return (
      <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
        <p className="text-sm font-medium text-foreground">{t("analytics.fees_error_description", locale)}</p>
        <Button className="mt-4" variant="outline" onClick={() => void mutate()}>
          <RefreshCw className="h-4 w-4" />
          {t("common.retry", locale)}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[132px] flex-col gap-1.5">
          <span className="font-display text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("analytics.period_label", locale)}
          </span>
          <span className="relative">
            <Calendar className="pointer-events-none absolute start-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as FeesPeriod)}
              className="h-8 w-full rounded-lg border border-border bg-popover ps-8 pe-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label={t("analytics.period_label", locale)}
            >
              <option value="30d">{t("analytics.period_30d", locale)}</option>
              <option value="60d">{t("analytics.period_60d", locale)}</option>
              <option value="90d">{t("analytics.period_90d", locale)}</option>
            </select>
          </span>
        </label>
        <label className="flex min-w-[150px] flex-col gap-1.5">
          <span className="font-display text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("common.marketplace", locale)}
          </span>
          <select
            value={marketplace}
            onChange={(event) => setMarketplace(event.target.value)}
            className="h-8 rounded-lg border border-border bg-popover px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label={t("common.marketplace", locale)}
          >
            <option value="">{t("analytics.fees_all_marketplaces", locale)}</option>
            {MARKETPLACES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard
          label={t("analytics.fees_total", locale)}
          value={formatAmount(fees?.summary.totalFees ?? 0, fees?.summary.currency || null, locale, mixedLabel)}
          subtitle={t("analytics.fees_signed_note", locale)}
          icon={CircleDollarSign}
          accentColor={fees && fees.summary.totalFees !== null && fees.summary.totalFees < 0 ? "red" : "green"}
        />
        <KpiCard
          label={t("analytics.fees_transactions", locale)}
          value={(fees?.summary.transactionCount || 0).toLocaleString(locale)}
          subtitle={t("analytics.fees_transaction_count_note", locale)}
          icon={Receipt}
          accentColor="cyan"
        />
      </div>

      {!fees || fees.summary.transactionCount === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Receipt className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
          <h2 className="font-display text-sm font-semibold text-foreground">{t("analytics.fees_empty_title", locale)}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("analytics.fees_empty_description", locale)}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <DataTableWrapper title={t("analytics.fees_composition", locale)} icon={Receipt}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="px-4 py-3 text-start font-display text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{t("analytics.fees_type", locale)}</th>
                    <th scope="col" className="px-4 py-3 text-end font-display text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{t("analytics.fees_amount", locale)}</th>
                    <th scope="col" className="px-4 py-3 text-end font-display text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{t("analytics.fees_transactions_short", locale)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {fees.byFeeType.map((item) => {
                    const total = compositionTotals.get(item.currency) || 0;
                    const percentage = total > 0 ? (Math.abs(item.amount) / total) * 100 : 0;
                    return (
                      <tr key={`${item.currency}-${item.feeType}`} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-foreground">
                          <div className="flex min-w-32 flex-col gap-1">
                            <span>{item.feeType} <span className="text-xs text-muted-foreground">({item.currency})</span></span>
                            <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <span className="block h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                            </span>
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-end font-display tabular-nums ${item.amount < 0 ? "text-rose-500" : "text-emerald-500"}`}>
                          {formatAmount(item.amount, item.currency, locale, mixedLabel)}
                        </td>
                        <td className="px-4 py-3 text-end font-display tabular-nums text-muted-foreground">{item.count.toLocaleString(locale)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DataTableWrapper>

          <DataTableWrapper title={t("analytics.fees_trend", locale)} icon={TrendingUp}>
            <div className="h-[280px] p-4 sm:p-5">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => fees.summary.currency === "mixed"
                      ? value.toLocaleString(locale)
                      : formatAmount(value, fees.summary.currency, locale, mixedLabel)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.75rem",
                    }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    formatter={(value, name) => [
                      formatAmount(Number(value), fees.summary.currency === "mixed" ? String(name) : fees.summary.currency, locale, mixedLabel),
                      t("analytics.fees_amount", locale),
                    ]}
                  />
                  {chartCurrencies.map((currency, index) => (
                    <Line
                      key={currency}
                      type="monotone"
                      dataKey={currency}
                      name={currency}
                      stroke={index === 0 ? "hsl(var(--primary))" : "hsl(var(--secondary))"}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                      animationDuration={700}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </DataTableWrapper>
        </div>
      )}

    </div>
  );
}
