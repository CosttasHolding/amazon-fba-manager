export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler, buildPagination, paginatedResponse } from '@/lib/api-handler';
import { productSchema } from '@/validations/product';
import { parseSort, PRODUCTS_SORT_MAP } from '@/lib/sort-parser';

export const GET = createApiHandler(async ({ supabase, orgId, req }) => {
        if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
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
        const { page, perPage, from, to } = buildPagination(req);

        let query = supabase
            .from('products_with_inventory')
            .select('*', { count: 'planned' })
            .eq('org_id', orgId);

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

        const { column, ascending } = parseSort(sort, PRODUCTS_SORT_MAP);
        const { data, count, error } = await query
            .range(from, to)
            .order(column, { ascending });

        if (error) throw error;

        return NextResponse.json(paginatedResponse(data || [], count || 0, page, perPage));
});

export const POST = createApiHandler(async ({ supabase, user, orgId, req }) => {
        if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
        const body = await req.json();
        const result = productSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: "Datos inválidos", details: result.error.flatten().fieldErrors }, { status: 400 });
        }
        const validated = result.data;

        const dbData = {
            user_id: user.id,
            org_id: orgId,
            sku: validated.sku || null,
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
            duty_rate: validated.dutyRate,
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
});
