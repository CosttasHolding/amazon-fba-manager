"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CategoryDataPoint {
  name: string;
  value: number;
  count: number;
}

interface CategoryChartProps {
  data: CategoryDataPoint[];
}

const COLORS = [
  "hsl(192, 100%, 50%)",
  "hsl(142, 71%, 45%)",
  "hsl(45, 93%, 47%)",
  "hsl(262, 80%, 58%)",
  "hsl(343, 81%, 59%)",
  "hsl(228, 25%, 45%)",
  "hsl(188, 80%, 42%)",
  "hsl(38, 92%, 50%)",
];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
      <p className="text-xs font-medium text-foreground mb-1">{data.name}</p>
      <p className="text-sm text-muted-foreground">
        ${Number(data.value).toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2})}
        <span className="text-xs ml-1">({data.count} productos)</span>
      </p>
    </div>
  );
}

export function CategoryChart({ data }: CategoryChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
        No hay datos de categorías disponibles
      </div>
    );
  }

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {data.slice(0, 6).map((entry, index) => (
          <span key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            {entry.name}
          </span>
        ))}
      </div>
    </div>
  );
}