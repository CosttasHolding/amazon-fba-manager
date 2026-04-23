"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

interface SalesDataPoint {
  date: string;
  revenue: number;
  units: number;
}

interface SalesChartProps {
  dataDaily: SalesDataPoint[];
  dataWeekly: SalesDataPoint[];
}

type ViewMode = "30d" | "12w";

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-border bg-popover p-3 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">
            {entry.name === "revenue" ? "Revenue" : "Unidades"}:
          </span>
          <span className="font-display font-semibold text-foreground">
            {entry.name === "revenue"
              ? `$${Number(entry.value).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SalesChart({ dataDaily, dataWeekly }: SalesChartProps) {
  const [view, setView] = useState<ViewMode>("30d");
  const data = view === "30d" ? dataDaily : dataWeekly;

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
        No hay datos de ventas disponibles
      </div>
    );
  }

  const formatYAxis = (v: number) => {
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
    return `$${v}`;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-end gap-1 mb-3">
        <button
          onClick={() => setView("30d")}
          className={cn(
            "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
            view === "30d"
              ? "bg-primary/10 text-primary border border-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          30 d\u00EDas
        </button>
        <button
          onClick={() => setView("12w")}
          className={cn(
            "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
            view === "12w"
              ? "bg-primary/10 text-primary border border-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          12 semanas
        </button>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(192, 100%, 50%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(192, 100%, 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="unitsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="revenue"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxis}
            />
            <YAxis
              yAxisId="units"
              orientation="right"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              yAxisId="revenue"
              type="monotone"
              dataKey="revenue"
              stroke="hsl(192, 100%, 50%)"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              name="revenue"
              animationDuration={800}
            />
            <Area
              yAxisId="units"
              type="monotone"
              dataKey="units"
              stroke="hsl(142, 71%, 45%)"
              strokeWidth={2}
              fill="url(#unitsGradient)"
              name="units"
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-0.5 rounded-full bg-[hsl(192,100%,50%)]" />
          Revenue
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-0.5 rounded-full bg-[hsl(142,71%,45%)]" />
          Unidades
        </span>
      </div>
    </div>
  );
}
