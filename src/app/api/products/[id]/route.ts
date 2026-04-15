import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { productSchema } from '@/validations/product';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data, error } = await supabase
            .from('products_with_inventory')
            .select('*')
            .eq('id', params.id)
            .eq('user_id', user.id)
            .single();

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 404 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
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
            .update(dbData)
            .eq('id', params.id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', params.id)
            .eq('user_id', user.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}