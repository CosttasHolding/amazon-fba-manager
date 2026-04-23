import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { productSchema } from '@/validations/product';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status');
        const stockStatus = searchParams.get('stockStatus');
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

        const { data, count, error } = await query
            .range((page - 1) * perPage, page * perPage - 1)
            .order('created_at', { ascending: false });

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
        const message = err instanceof Error ? err.message : "Error desconocido";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const validated = productSchema.parse(body);

        // Convertir camelCase a snake_case para Supabase
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
        const message = err instanceof Error ? err.message : "Error desconocido";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}