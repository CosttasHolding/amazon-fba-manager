import type { ComparisonPoint } from "@/types";

export interface SalesChartPoint {
  date: string;
  revenue: number;
  units: number;
}

export interface CategoryChartPoint {
  name: string;
  value: number;
  count: number;
}

export interface ProfitChartPoint {
  name: string;
  profit: number;
  roi: number;
  sku: string;
}

interface ProductRow {
  id: string;
  status: string;
  name: string;
  sku: string;
  sale_price: number | null;
  net_profit: number | null;
  roi: number | null;
  stock_available: number | null;
  sales_velocity_30d: number | null;
  category: string | null;
}

interface SaleRow {
  sale_date: string;
  revenue: number | null;
  units_sold: number | null;
}

export function buildSalesChart30d(salesData: SaleRow[], locale: string = "es-ES"): SalesChartPoint[] {
  const salesByDate: Record<string, { revenue: number; units: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    salesByDate[key] = { revenue: 0, units: 0 };
  }
  for (const sale of salesData) {
    const key = sale.sale_date;
    if (salesByDate[key]) {
      salesByDate[key].revenue += sale.revenue || 0;
      salesByDate[key].units += sale.units_sold || 0;
    }
  }
  return Object.entries(salesByDate).map(([date, vals]) => ({
    date: new Date(date + "T12:00:00").toLocaleDateString(locale === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short" }),
    revenue: Math.round(vals.revenue * 100) / 100,
    units: vals.units,
  }));
}

export function buildSalesChartWeekly(salesData: SaleRow[]): SalesChartPoint[] {
  const salesByWeek: Record<string, { weekLabel: string; revenue: number; units: number }> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const weekStart = new Date(d);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekKey = weekStart.toISOString().split("T")[0];
    salesByWeek[weekKey] = { weekLabel: `S${12 - i}`, revenue: 0, units: 0 };
  }
  for (const sale of salesData) {
    const saleDate = new Date(sale.sale_date);
    const weekStart = new Date(saleDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekKey = weekStart.toISOString().split("T")[0];
    if (salesByWeek[weekKey]) {
      salesByWeek[weekKey].revenue += sale.revenue || 0;
      salesByWeek[weekKey].units += sale.units_sold || 0;
    }
  }
  return Object.entries(salesByWeek).map(([_, vals]) => ({
    date: vals.weekLabel,
    revenue: Math.round(vals.revenue * 100) / 100,
    units: vals.units,
  }));
}

export function buildCategoryChart(activeProducts: ProductRow[]): CategoryChartPoint[] {
  const categoryMap: Record<string, { profit: number; count: number }> = {};
  for (const p of activeProducts) {
    const cat = p.category || "Sin categoría";
    if (!categoryMap[cat]) categoryMap[cat] = { profit: 0, count: 0 };
    categoryMap[cat].profit += p.net_profit || 0;
    categoryMap[cat].count += 1;
  }
  return Object.entries(categoryMap)
    .map(([name, vals]) => ({
      name,
      value: Math.round(Math.abs(vals.profit) * 100) / 100,
      count: vals.count,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export function buildComparisonChart(salesData: SaleRow[], locale: string = "es-ES"): { daily: ComparisonPoint[]; totalCurrent: number; totalPrevious: number } {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split("T")[0];

  const currentMap: Record<string, number> = {};
  const previousMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    currentMap[key] = 0;
  }
  for (let i = 59; i >= 30; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    previousMap[key] = 0;
  }

  for (const sale of salesData) {
    const key = sale.sale_date;
    if (currentMap[key] !== undefined) currentMap[key] += sale.revenue || 0;
    if (previousMap[key] !== undefined) previousMap[key] += sale.revenue || 0;
  }

  const totalCurrent = Object.values(currentMap).reduce((a, b) => a + b, 0);
  const totalPrevious = Object.values(previousMap).reduce((a, b) => a + b, 0);

  const daily = Object.entries(currentMap).map(([date, current]) => ({
    date: new Date(date + "T12:00:00").toLocaleDateString(locale === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short" }),
    current: Math.round(current * 100) / 100,
    previous: Math.round((previousMap[date] || 0) * 100) / 100,
  }));

  return { daily, totalCurrent, totalPrevious };
}

export function buildProfitChart(activeProducts: ProductRow[]): ProfitChartPoint[] {
  return activeProducts
    .sort((a, b) => (b.net_profit || 0) - (a.net_profit || 0))
    .slice(0, 10)
    .map((p) => ({
      name: p.name,
      profit: Math.round((p.net_profit || 0) * 100) / 100,
      roi: Math.round((p.roi || 0) * 100) / 100,
      sku: p.sku,
    }));
}
