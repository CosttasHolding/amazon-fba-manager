import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { productSchema } from '@/validations/product';

function parseSort(sort: string | null): { column: string; ascending: boolean } {
  switch (sort) {
    case 'oldest': return { column: 'created_at', ascending: true };
    case 'name_asc': return { column: 'name', ascending: true };
    case 'name_desc': return { column: 'name', ascending: false };
    case 'price_asc': return { column: 'sale_price', ascending: true };
    case 'price_desc': return { column: 'sale_price', ascending: false };
    case 'profit_asc': return { column: 'net_profit', ascending: true };
    case 'profit_desc': return { column: 'net_profit', ascending: false };
    case 'roi_asc': return { column: 'roi', ascending: true };
    case 'roi_desc': return { column: 'roi', ascending: false };
    case 'stock_asc': return { column: 'stock_available', ascending: true };
    case 'stock_desc': return { column: 'stock_available', ascending: false };
    default: return { column: 'created_at', ascending: false };
  }
}

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status');
        const stockStatus = searchParams.get('stockStatus');
        const category = searchParams.get('category');
        const marketplace = searchParams.get('marketplace');
        const priceMin = searchParams.get('priceMin');
        const priceMax = searchParams.get('priceMax');
        const roiMin = searchParams.get('roiMin');
        const roiMax = searchParams.get('roiMax');
        const sort = searchParams.get('sort');
        const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
        const perPage = Math.min(200, Math.max(1, parseInt(searchParams.get('perPage') || '20') || 20));

        let query = supabase
            .from('products_with_inventory')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id);

        if (search) {
            const cleanSearch = search.replace(/[%_]/g, '\\$&');
            query = query.or(`sku.ilike.%${cleanSearch}%,name.ilike.%${cleanSearch}%`);
        }
        if (status) query = query.eq('status', status);
        if (stockStatus) query = query.eq('stock_status', stockStatus);
        if (category) query = query.eq('category', category);
        if (marketplace) query = query.eq('marketplace', marketplace);
        if (priceMin !== null && priceMin !== '') query = query.gte('sale_price', parseFloat(priceMin));
        if (priceMax !== null && priceMax !== '') query = query.lte('sale_price', parseFloat(priceMax));
        if (roiMin !== null && roiMin !== '') query = query.gte('roi', parseFloat(roiMin));
        if (roiMax !== null && roiMax !== '') query = query.lte('roi', parseFloat(roiMax));

        const { column, ascending } = parseSort(sort);
        const { data, count, error } = await query
            .range((page - 1) * perPage, page * perPage - 1)
            .order(column, { ascending });

        if (error) throw error;

        return NextResponse.json({
            data,
            pagination: {
                total: count || 0,
                page,
                perPage,
                totalPages: Math.ceil((count || 0) / perPage),
            },
        });
    } catch (err) {
        console.error('[GET /api/products]', err);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const validated = productSchema.parse(body);

        const dbData = {
            user_id: user.id,
            sku: validated.sku,
            asin: validated.asin || null,
            name: validated.name,
            category: validated.category || null,
            weight_kg: validated.weightKg || null,
            marketplace: validated.marketplace,
            unit_cost: validated.unitCost,
            shipping_cost: validated.shippingCost,
            prep_cost: validated.prepCost,
            taxes: validated.taxes,
            sale_price: validated.salePrice,
            referral_fee: validated.referralFee,
            fba_fee: validated.fbaFee,
            storage_fee_monthly: validated.storageFeeMonthly,
            other_fees: validated.otherFees,
            status: validated.status,
            notes: validated.notes || null,
        };

        const { data, error } = await supabase
            .from('products')
            .insert(dbData)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ data }, { status: 201 });
    } catch (err) {
        console.error('[POST /api/products]', err);
        const message = err instanceof Error ? err.message : "Error desconocido";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
