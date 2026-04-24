import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('products_with_inventory')
      .select('status, roi, net_profit, sale_price, category')
      .eq('user_id', user.id);

    if (error) throw error;

    const rows = data || [];
    const totalCount = rows.length;
    const activeCount = rows.filter((r) => r.status === 'active').length;
    const avgRoi = totalCount > 0
      ? rows.reduce((sum, r) => sum + (r.roi || 0), 0) / totalCount
      : 0;
    const totalProfit = rows.reduce((sum, r) => sum + (r.net_profit || 0), 0);
    const avgPrice = totalCount > 0
      ? rows.reduce((sum, r) => sum + (r.sale_price || 0), 0) / totalCount
      : 0;
    const categories = [...new Set(rows.map((r) => r.category).filter(Boolean))] as string[];

    return NextResponse.json({
      totalCount,
      activeCount,
      avgRoi: Math.round(avgRoi * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      avgPrice: Math.round(avgPrice * 100) / 100,
      categories: categories.sort(),
    });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
