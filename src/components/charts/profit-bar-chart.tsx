"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ProfitDataPoint {
  name: string;
  profit: number;
  roi: number;
  sku: string;
}

interface ProfitBarChartProps {
  data: ProfitDataPoint[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: Record<string, unknown> }[] }) {
  if (!active || !payload || !payload.length) return null;

  const d = payload[0].payload as unknown as ProfitDataPoint;

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-lg max-w-[220px]">
      <p className="text-sm font-medium text-foreground mb-1 truncate">
        {d.name}
      </p>
      <p className="text-xs text-muted-foreground font-mono mb-2">
        {d.sku}
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Beneficio:</span>
          <span
            className={`font-display font-semibold ${
              d.profit >= 0 ? "text-emerald-500" : "text-red-500"
            }`}
          >
            ${Number(d.profit).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">ROI:</span>
          <span
            className={`font-display font-semibold ${
              d.roi >= 20
                ? "text-emerald-500"
                : d.roi > 0
                  ? "text-amber-500"
                  : "text-red-500"
            }`}
          >
            {Number(d.roi).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function getBarColor(profit: number): string {
  if (profit >= 10) return "hsl(142, 71%, 45%)";
  if (profit >= 5) return "hsl(192, 100%, 50%)";
  if (profit > 0) return "hsl(45, 93%, 47%)";
  return "hsl(343, 81%, 59%)";
}

export function ProfitBarChart({ data }: ProfitBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
        No hay datos de productos disponibles
      </div>
    );
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -10, bottom: 40 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            strokeOpacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            angle={-35}
            textAnchor="end"
            interval={0}
            tickFormatter={(v) =>
              v.length > 15 ? v.substring(0, 14) + "…" : v
            }
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
            }
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
          <Bar dataKey="profit" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.profit)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}