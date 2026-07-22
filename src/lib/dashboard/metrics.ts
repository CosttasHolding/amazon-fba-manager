import type { DashboardMetrics } from "@/types";

interface ProductRow {
  id: string;
  status: string;
  net_profit: number | null;
  sale_price: number | null;
  roi: number | null;
  stock_available: number | null;
  stock_status: string | null;
  unit_cost: number | null;
  revenue_last_30d: number | null;
  sales_velocity_30d: number | null;
}

interface SaleRow {
  sale_date: string;
  revenue: number | null;
  units_sold: number | null;
  product_id: string;
}

export function calcMetrics(products: ProductRow[], currentMonthSales: SaleRow[], lastMonthSales: SaleRow[]): DashboardMetrics {
  const activeProducts = products.filter((p) => p.status === "active");
  const activeCount = activeProducts.length;

  const avgMargin = activeCount > 0
    ? activeProducts.reduce((sum, p) => {
        if (p.sale_price && p.sale_price > 0) {
          return sum + ((p.net_profit || 0) / p.sale_price) * 100;
        }
        return sum;
      }, 0) / activeProducts.filter((p) => p.sale_price && p.sale_price > 0).length || 0
    : 0;

  const totalInventoryValue = products.reduce(
    (sum, p) => sum + ((p.stock_available || 0) * (p.unit_cost || 0)), 0
  );

  const revenueCurrentMonth = currentMonthSales.reduce((sum, s) => sum + (s.revenue || 0), 0);
  const revenueLastMonth = lastMonthSales.reduce((sum, s) => sum + (s.revenue || 0), 0);
  const revenueDeltaPct = revenueLastMonth > 0
    ? ((revenueCurrentMonth - revenueLastMonth) / revenueLastMonth) * 100 : 0;

  const unitsCurrentMonth = currentMonthSales.reduce((sum, s) => sum + (s.units_sold || 0), 0);
  const unitsLastMonth = lastMonthSales.reduce((sum, s) => sum + (s.units_sold || 0), 0);
  const unitsDeltaPct = unitsLastMonth > 0
    ? ((unitsCurrentMonth - unitsLastMonth) / unitsLastMonth) * 100 : 0;

  const productRoiMap: Record<string, number> = {};
  for (const p of activeProducts) {
    productRoiMap[p.id] = p.roi || 0;
  }
  let weightedRoiSum = 0;
  let weightedRevenueSum = 0;
  for (const s of currentMonthSales) {
    const roi = productRoiMap[s.product_id] || 0;
    const rev = s.revenue || 0;
    weightedRoiSum += roi * rev;
    weightedRevenueSum += rev;
  }
  const weightedAvgRoi = weightedRevenueSum > 0 ? weightedRoiSum / weightedRevenueSum : 0;

  let netMarginSum = 0;
  let netMarginCount = 0;
  for (const s of currentMonthSales) {
    const product = products.find((p) => p.id === s.product_id);
    if (product && product.net_profit && s.revenue && s.revenue > 0) {
      const salePrice = product.sale_price ?? 0;
      const marginPct = salePrice > 0 ? (product.net_profit / salePrice) * 100 : 0;
      netMarginSum += marginPct;
      netMarginCount++;
    }
  }
  const marginNetAvg = netMarginCount > 0 ? netMarginSum / netMarginCount : avgMargin;

  return {
    total_products: products.length,
    active_products: activeCount,
    avg_roi: activeCount > 0
      ? activeProducts.reduce((sum, p) => sum + (p.roi || 0), 0) / activeCount : 0,
    total_potential_profit: activeProducts.reduce((sum, p) => sum + (p.net_profit || 0), 0),
    avg_profit: activeCount > 0
      ? activeProducts.reduce((sum, p) => sum + (p.net_profit || 0), 0) / activeCount : 0,
    avg_margin: avgMargin,
    total_inventory_value: totalInventoryValue,
    low_stock_count: products.filter((p) => p.stock_status === "low_stock").length,
    overstock_count: products.filter((p) => p.stock_status === "overstock").length,
    out_of_stock_count: products.filter((p) => p.stock_status === "out_of_stock").length,
    revenue_last_30d: products.reduce((sum, p) => sum + (p.revenue_last_30d || 0), 0),
    units_sold_last_30d: products.reduce((sum, p) => sum + (p.sales_velocity_30d || 0), 0),
    revenue_current_month: revenueCurrentMonth,
    revenue_last_month: revenueLastMonth,
    revenue_delta_pct: revenueDeltaPct,
    units_current_month: unitsCurrentMonth,
    units_last_month: unitsLastMonth,
    units_delta_pct: unitsDeltaPct,
    weighted_avg_roi: weightedAvgRoi,
    margin_net_avg: marginNetAvg,
  };
}
