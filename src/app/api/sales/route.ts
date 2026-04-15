import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('sales')
      .select('*, products(name, sku)')
      .eq('user_id', user.id)
      .order('sale_date', { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const { data, error } = await supabase
      .from('sales')
      .insert({
        product_id: body.productId || body.product_id,
        sale_date: body.saleDate || body.sale_date,
        units_sold: body.unitsSold || body.units_sold,
        sale_price: body.salePrice || body.sale_price,
        amazon_fees: body.amazonFees || body.amazon_fees,
        cost: body.cost,
        profit: body.profit,
        order_id: body.orderId || body.order_id,
        marketplace: body.marketplace || 'US',
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}