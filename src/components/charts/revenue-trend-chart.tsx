"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RevenueTrendPoint {
  date: string;
  revenue: number;
  profit: number;
  units: number;
}

interface RevenueTrendChartProps {
  data: RevenueTrendPoint[];
}

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">
            {entry.name === "revenue"
              ? "Revenue"
              : entry.name === "profit"
                ? "Profit"
                : "Unidades"}
            :
          </span>
          <span className="font-display font-semibold text-foreground">
            {entry.name === "units"
              ? entry.value
              : `$${Number(entry.value).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
        No hay datos de ventas disponibles
      </div>
    );
  }

  const formatYAxis = (v: number) => {
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
    return `$v`;
  };

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(192, 100%, 50%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(192, 100%, 50%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
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
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatYAxis}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="hsl(192, 100%, 50%)"
            strokeWidth={2}
            fill="url(#revGradient)"
            name="revenue"
          />
          <Area
            type="monotone"
            dataKey="profit"
            stroke="hsl(142, 71%, 45%)"
            strokeWidth={2}
            fill="url(#profitGradient)"
            name="profit"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-6 mt-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-0.5 rounded-full bg-[hsl(192,100%,50%)]" />
          Revenue
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-0.5 rounded-full bg-[hsl(142,71%,45%)]" />
          Profit
        </span>
      </div>
    </div>
  );
}