import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: products } = await supabase
      .from('products_with_inventory')
      .select('*')
      .eq('user_id', user.id);

    const allProducts = products || [];
    const activeProducts = allProducts.filter((p) => p.status === 'active');
    const activeCount = activeProducts.length;

    // Calculate avg margin: (net_profit / sale_price) * 100
    const avgMargin = activeCount > 0
      ? activeProducts.reduce((sum, p) => {
          if (p.sale_price && p.sale_price > 0) {
            return sum + ((p.net_profit || 0) / p.sale_price) * 100;
          }
          return sum;
        }, 0) / activeProducts.filter((p) => p.sale_price && p.sale_price > 0).length || 0
      : 0;

    // Calculate total inventory value: stock_available * unit_cost
    const totalInventoryValue = allProducts.reduce(
      (sum, p) => sum + ((p.stock_available || 0) * (p.unit_cost || 0)),
      0
    );

    // ============================================
    // Sales data for deltas and weighted ROI
    // ============================================
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const currentMonthEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(new Date(currentYear, currentMonth + 1, 0).getDate()).padStart(2, '0')}`;
    const lastMonthStart = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}-01`;
    const lastMonthEnd = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}-${String(new Date(lastMonthYear, lastMonth + 1, 0).getDate()).padStart(2, '0')}`;

    const { data: allSales } = await supabase
      .from('sales')
      .select('sale_date, revenue, units_sold, product_id')
      .eq('user_id', user.id)
      .gte('sale_date', lastMonthStart)
      .order('sale_date', { ascending: true });

    const sales = allSales || [];

    const currentMonthSales = sales.filter((s) => s.sale_date >= currentMonthStart && s.sale_date <= currentMonthEnd);
    const lastMonthSales = sales.filter((s) => s.sale_date >= lastMonthStart && s.sale_date <= lastMonthEnd);

    const revenueCurrentMonth = currentMonthSales.reduce((sum, s) => sum + (s.revenue || 0), 0);
    const revenueLastMonth = lastMonthSales.reduce((sum, s) => sum + (s.revenue || 0), 0);
    const revenueDeltaPct = revenueLastMonth > 0
      ? ((revenueCurrentMonth - revenueLastMonth) / revenueLastMonth) * 100
      : 0;

    const unitsCurrentMonth = currentMonthSales.reduce((sum, s) => sum + (s.units_sold || 0), 0);
    const unitsLastMonth = lastMonthSales.reduce((sum, s) => sum + (s.units_sold || 0), 0);
    const unitsDeltaPct = unitsLastMonth > 0
      ? ((unitsCurrentMonth - unitsLastMonth) / unitsLastMonth) * 100
      : 0;

    // Weighted ROI by revenue (not simple average)
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

    // Net margin average (net_profit / revenue)
    let netMarginSum = 0;
    let netMarginCount = 0;
    for (const s of currentMonthSales) {
      const product = allProducts.find((p) => p.id === s.product_id);
      if (product && product.net_profit && s.revenue && s.revenue > 0) {
        // Estimate net margin per sale: (net_profit / sale_price) * revenue
        const marginPct = product.sale_price > 0 ? (product.net_profit / product.sale_price) * 100 : 0;
        netMarginSum += marginPct;
        netMarginCount++;
      }
    }
    const marginNetAvg = netMarginCount > 0 ? netMarginSum / netMarginCount : avgMargin;

    const metrics = {
      total_products: allProducts.length,
      active_products: activeCount,
      avg_roi: activeCount > 0
        ? activeProducts.reduce((sum, p) => sum + (p.roi || 0), 0) / activeCount
        : 0,
      total_potential_profit: activeProducts.reduce(
        (sum, p) => sum + (p.net_profit || 0), 0
      ),
      avg_profit: activeCount > 0
        ? activeProducts.reduce((sum, p) => sum + (p.net_profit || 0), 0) / activeCount
        : 0,
      avg_margin: avgMargin,
      total_inventory_value: totalInventoryValue,
      low_stock_count: allProducts.filter((p) => p.stock_status === 'low_stock').length,
      overstock_count: allProducts.filter((p) => p.stock_status === 'overstock').length,
      out_of_stock_count: allProducts.filter((p) => p.stock_status === 'out_of_stock').length,
      revenue_last_30d: allProducts.reduce((sum, p) => sum + (p.revenue_last_30d || 0), 0),
      units_sold_last_30d: allProducts.reduce((sum, p) => sum + (p.sales_velocity_30d || 0), 0),
      // Nuevos KPIs
      revenue_current_month: revenueCurrentMonth,
      revenue_last_month: revenueLastMonth,
      revenue_delta_pct: revenueDeltaPct,
      units_current_month: unitsCurrentMonth,
      units_last_month: unitsLastMonth,
      units_delta_pct: unitsDeltaPct,
      weighted_avg_roi: weightedAvgRoi,
      margin_net_avg: marginNetAvg,
    };

    const topProducts = activeProducts
      .sort((a, b) => (b.net_profit || 0) - (a.net_profit || 0))
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

    const alerts = allProducts
      .filter((p) => ['low_stock', 'out_of_stock', 'overstock'].includes(p.stock_status))
      .sort((a, b) => {
        const priority: Record<string, number> = { out_of_stock: 0, low_stock: 1, overstock: 2 };
        return (priority[a.stock_status] ?? 3) - (priority[b.stock_status] ?? 3);
      })
      .map((p) => ({
        id: p.id,
        type: p.stock_status,
        product_name: p.name,
        sku: p.sku,
        current_stock: p.stock_available,
        threshold: p.reorder_point,
      }));

    // ============================================
    // Chart Data: Sales last 30 days (daily)
    // ============================================
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: salesData30d } = await supabase
      .from('sales')
      .select('sale_date, revenue, units_sold')
      .eq('user_id', user.id)
      .gte('sale_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('sale_date', { ascending: true });

    const salesByDate: Record<string, { revenue: number; units: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      salesByDate[key] = { revenue: 0, units: 0 };
    }
    if (salesData30d) {
      for (const sale of salesData30d) {
        const key = sale.sale_date;
        if (salesByDate[key]) {
          salesByDate[key].revenue += sale.revenue || 0;
          salesByDate[key].units += sale.units_sold || 0;
        }
      }
    }
    const salesChartData = Object.entries(salesByDate).map(([date, vals]) => ({
      date: new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
      }),
      revenue: Math.round(vals.revenue * 100) / 100,
      units: vals.units,
    }));

    // ============================================
    // Chart Data: Sales last 12 weeks (weekly)
    // ============================================
    const salesByWeek: Record<string, { weekLabel: string; revenue: number; units: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const weekStart = new Date(d);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      const weekLabel = `S${12 - i}`;
      salesByWeek[weekKey] = { weekLabel, revenue: 0, units: 0 };
    }

    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
    const { data: salesData12w } = await supabase
      .from('sales')
      .select('sale_date, revenue, units_sold')
      .eq('user_id', user.id)
      .gte('sale_date', twelveWeeksAgo.toISOString().split('T')[0])
      .order('sale_date', { ascending: true });

    if (salesData12w) {
      for (const sale of salesData12w) {
        const saleDate = new Date(sale.sale_date);
        const weekStart = new Date(saleDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        if (salesByWeek[weekKey]) {
          salesByWeek[weekKey].revenue += sale.revenue || 0;
          salesByWeek[weekKey].units += sale.units_sold || 0;
        }
      }
    }
    const salesChartDataWeekly = Object.entries(salesByWeek).map(([_, vals]) => ({
      date: vals.weekLabel,
      revenue: Math.round(vals.revenue * 100) / 100,
      units: vals.units,
    }));

    // ============================================
    // Chart Data: Category distribution
    // ============================================
    const categoryMap: Record<string, { profit: number; count: number }> = {};

    for (const p of activeProducts) {
      const cat = p.category || 'Sin categor\u00EDa';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { profit: 0, count: 0 };
      }
      categoryMap[cat].profit += p.net_profit || 0;
      categoryMap[cat].count += 1;
    }

    const categoryChartData = Object.entries(categoryMap)
      .map(([name, vals]) => ({
        name,
        value: Math.round(Math.abs(vals.profit) * 100) / 100,
        count: vals.count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // ============================================
    // Chart Data: Profit bar chart (top 10)
    // ============================================
    const profitChartData = activeProducts
      .sort((a, b) => (b.net_profit || 0) - (a.net_profit || 0))
      .slice(0, 10)
      .map((p) => ({
        name: p.name,
        profit: Math.round((p.net_profit || 0) * 100) / 100,
        roi: Math.round((p.roi || 0) * 100) / 100,
        sku: p.sku,
      }));

    return NextResponse.json({
      metrics,
      topProducts,
      alerts,
      charts: {
        salesChartData,
        salesChartDataWeekly,
        categoryChartData,
        profitChartData,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
