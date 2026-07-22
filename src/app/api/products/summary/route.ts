import { NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api-handler';

export const GET = createApiHandler(async ({ supabase, orgId }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const { data, error } = await supabase
    .from('products_with_inventory')
    .select('status, roi, net_profit, sale_price, category')
    .eq('org_id', orgId);

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
});
