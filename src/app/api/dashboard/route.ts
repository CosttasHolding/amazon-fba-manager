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
    };

    const topProducts = allProducts
      .filter((p) => p.status === 'active')
      .sort((a, b) => (b.net_profit || 0) - (a.net_profit || 0))
      .slice(0, 10)
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

    return NextResponse.json({ metrics, topProducts, alerts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}