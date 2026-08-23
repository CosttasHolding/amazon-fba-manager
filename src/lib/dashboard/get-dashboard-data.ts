import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardResponse } from "@/types";
import { calcMetrics } from "@/lib/dashboard/metrics";
import { buildSalesChart30d, buildSalesChartWeekly, buildCategoryChart, buildProfitChart, buildComparisonChart } from "@/lib/dashboard/charts";

const PRODUCT_FIELDS = "id,name,sku,status,net_profit,sale_price,roi,stock_available,stock_status,unit_cost,total_cost,category,revenue_last_30d,sales_velocity_30d,reorder_point";
const SALE_FIELDS = "sale_date,revenue,units_sold,product_id";
const DASHBOARD_PRODUCT_LIMIT = 500;

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  status: string;
  net_profit: number | null;
  sale_price: number | null;
  roi: number | null;
  stock_available: number | null;
  stock_status: string | null;
  unit_cost: number | null;
  total_cost: number | null;
  category: string | null;
  revenue_last_30d: number | null;
  sales_velocity_30d: number | null;
  reorder_point: number | null;
}

interface SaleRow {
  sale_date: string;
  revenue: number;
  units_sold: number;
  product_id: string;
}

export async function getDashboardData(supabase: SupabaseClient, orgId: string, locale: "es" | "en") {
  const [productResult, salesResult] = await Promise.all([
    supabase
      .from("products_with_inventory")
      .select(PRODUCT_FIELDS)
      .eq("org_id", orgId)
      .order("net_profit", { ascending: false })
      .limit(DASHBOARD_PRODUCT_LIMIT),
    supabase
      .from("sales")
      .select(SALE_FIELDS)
      .eq("org_id", orgId)
      .gte("sale_date", new Date(Date.now() - 84 * 86400000).toISOString().split("T")[0])
      .order("sale_date", { ascending: true }),
  ]);

  const allProducts = (productResult.data || []) as ProductRow[];
  const sales = (salesResult.data || []) as SaleRow[];
  const activeProducts = allProducts.filter((p) => p.status === "active");

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const pad = (n: number) => String(n).padStart(2, "0");
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const currentMonthStart = `${currentYear}-${pad(currentMonth + 1)}-01`;
  const currentMonthEnd = `${currentYear}-${pad(currentMonth + 1)}-${pad(daysInMonth(currentYear, currentMonth))}`;
  const lastMonthStart = `${lastMonthYear}-${pad(lastMonth + 1)}-01`;
  const lastMonthEnd = `${lastMonthYear}-${pad(lastMonth + 1)}-${pad(daysInMonth(lastMonthYear, lastMonth))}`;

  const currentMonthSales = sales.filter((s) => s.sale_date >= currentMonthStart && s.sale_date <= currentMonthEnd);
  const lastMonthSales = sales.filter((s) => s.sale_date >= lastMonthStart && s.sale_date <= lastMonthEnd);

  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString().split("T")[0];
  const salesData30d = sales.filter((s) => s.sale_date >= sixtyDaysAgo);

  const topProducts = activeProducts
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      sale_price: p.sale_price,
      net_profit: p.net_profit,
      roi: p.roi,
      status: p.status,
      stock_available: p.stock_available,
      sales_velocity_30d: p.sales_velocity_30d,
    }));

  const stockPriority: Record<string, number> = { out_of_stock: 0, low_stock: 1, overstock: 2 };
  const alerts = allProducts
    .filter((p) => p.stock_status && stockPriority[p.stock_status] !== undefined)
    .sort((a, b) => (stockPriority[a.stock_status ?? ""] ?? 3) - (stockPriority[b.stock_status ?? ""] ?? 3))
    .map((p) => ({
      id: p.id,
      type: p.stock_status as string,
      product_name: p.name,
      sku: p.sku,
      current_stock: p.stock_available,
      threshold: p.reorder_point,
    }));

  const response = {
    metrics: calcMetrics(allProducts, currentMonthSales, lastMonthSales),
    topProducts,
    alerts,
    charts: {
      salesChartData: buildSalesChart30d(salesData30d, locale),
      salesChartDataWeekly: buildSalesChartWeekly(sales),
      categoryChartData: buildCategoryChart(activeProducts),
      profitChartData: buildProfitChart(activeProducts),
      comparison: buildComparisonChart(salesData30d, locale),
    },
  };

  return response as unknown as DashboardResponse;
}
