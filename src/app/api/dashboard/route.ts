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

    const activeProducts = products?.filter((p) => p.status === 'active') || [];
    const activeCount = activeProducts.length;

    const metrics = {
      total_products: products?.length || 0,
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
      low_stock_count: products?.filter((p) => p.stock_status === 'low_stock').length || 0,
      overstock_count: products?.filter((p) => p.stock_status === 'overstock').length || 0,
      out_of_stock_count: products?.filter((p) => p.stock_status === 'out_of_stock').length || 0,
      revenue_last_30d: products?.reduce((sum, p) => sum + (p.revenue_last_30d || 0), 0) || 0,
      units_sold_last_30d: products?.reduce((sum, p) => sum + (p.sales_velocity_30d || 0), 0) || 0,
    };

    const topProducts = products
      ?.sort((a, b) => (b.net_profit || 0) - (a.net_profit || 0))
      .slice(0, 10) || [];

    const alerts = products
      ?.filter((p) => ['low_stock', 'out_of_stock', 'overstock'].includes(p.stock_status))
      .map((p) => ({
        id: p.id,
        type: p.stock_status,
        product_id: p.id,
        product_name: p.name,
        sku: p.sku,
        current_stock: p.stock_available,
        threshold: p.reorder_point,
      })) || [];

    return NextResponse.json({ metrics, topProducts, revenueChart: [], alerts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}