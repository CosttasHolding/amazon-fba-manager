"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { t, Locale } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

interface ComparisonPoint {
  date: string;
  current: number;
  previous: number;
}

interface ComparisonChartProps {
  data: {
    daily: ComparisonPoint[];
    totalCurrent: number;
    totalPrevious: number;
  };
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
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

export function DeltaBadge({ value }: { value: number }) {
  const isUp = value > 0;
  const isDown = value < 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isUp
          ? "bg-green-500/10 text-green-500"
          : isDown
            ? "bg-red-500/10 text-red-500"
            : "bg-muted text-muted-foreground"
      }`}
    >
      {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      {isUp ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

export function ComparisonChart({ data }: ComparisonChartProps) {
  const { locale } = useLocale();
  if (!data || data.daily.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
        {t("charts.comparison_no_data", locale)}
      </div>
    );
  }

  const deltaPct = data.totalPrevious > 0
    ? ((data.totalCurrent - data.totalPrevious) / data.totalPrevious) * 100
    : 0;

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground mb-1">{t("charts.current_period", locale)}</p>
          <p className="text-lg font-display font-bold text-foreground">
            ${data.totalCurrent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground mb-1">{t("charts.previous_period", locale)}</p>
          <p className="text-lg font-display font-bold text-foreground">
            ${data.totalPrevious.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-1">
            <DeltaBadge value={deltaPct} />
          </div>
        </div>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.daily}
            margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              interval={2}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              dataKey="current"
              name={t("charts.current", locale)}
              fill="hsl(192, 100%, 50%)"
              radius={[3, 3, 0, 0]}
              animationDuration={800}
            />
            <Bar
              dataKey="previous"
              name={t("charts.previous", locale)}
              fill="hsl(142, 71%, 45%)"
              radius={[3, 3, 0, 0]}
              animationDuration={800}
              opacity={0.6}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-0.5 rounded-full bg-[hsl(192,100%,50%)]" />
          {t("charts.current", locale)}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-0.5 rounded-full bg-[hsl(142,71%,45%)]" />
          {t("charts.previous", locale)}
        </span>
      </div>
    </div>
  );
}
