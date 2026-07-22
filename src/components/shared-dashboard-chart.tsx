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

interface Props {
  data: { date: string; revenue: number }[];
}

export function SharedDashboardChart({ data }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="sdGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(192, 100%, 50%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(192, 100%, 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-xl border border-border bg-popover p-3 shadow-lg">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-sm font-display font-semibold text-foreground">
                    ${Number(payload[0].value).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="hsl(192, 100%, 50%)"
            strokeWidth={2}
            fill="url(#sdGradient)"
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
