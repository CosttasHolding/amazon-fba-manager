import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("products_with_inventory")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (error) throw error;

    const uc = data.unit_cost ?? data.buy_cost ?? 0;
    const sp = data.sale_price ?? data.sell_price ?? 0;
    const ff = data.fba_fee ?? 0;
    const rf = data.referral_fee ?? 0;
    const sc = data.shipping_cost ?? 0;
    const sf = data.storage_fee_monthly ?? data.storage_cost ?? 0;
    const totalCost = uc + ff + rf + sc + sf;
    const profitVal = sp - totalCost;
    const roiVal = uc > 0 ? (profitVal / uc) * 100 : 0;
    const marginVal = sp > 0 ? (profitVal / sp) * 100 : 0;

    const enriched = {
      ...data,
      buy_cost: uc,
      sell_price: sp,
      unit_cost: uc,
      sale_price: sp,
      storage_cost: sf,
      storage_fee_monthly: sf,
      fba_fee: ff,
      referral_fee: rf,
      shipping_cost: sc,
      weight: data.weight_kg ?? data.weight ?? 0,
      weight_kg: data.weight_kg ?? data.weight ?? 0,
      current_stock: data.current_stock ?? 0,
      min_stock: data.min_stock ?? 10,
      profit: data.profit ?? profitVal,
      roi: data.roi ?? roiVal,
      margin: data.margin ?? marginVal,
    };

    return NextResponse.json(enriched);
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const dbData: Record<string, any> = {
      name: body.name,
      sku: body.sku,
      asin: body.asin || null,
      category: body.category || null,
      status: body.status || "active",
      marketplace: body.marketplace || "US",
      unit_cost: body.unitCost ?? body.unit_cost ?? body.buy_cost ?? 0,
      sale_price: body.salePrice ?? body.sale_price ?? body.sell_price ?? 0,
      fba_fee: body.fbaFee ?? body.fba_fee ?? 0,
      referral_fee: body.referralFee ?? body.referral_fee ?? 0,
      shipping_cost: body.shippingCost ?? body.shipping_cost ?? 0,
      storage_fee_monthly: body.storageFeeMonthly ?? body.storageCost ?? body.storage_fee_monthly ?? body.storage_cost ?? 0,
      prep_cost: body.prepCost ?? body.prep_cost ?? 0,
      taxes: body.taxes ?? 0,
      other_fees: body.otherFees ?? body.other_fees ?? 0,
      weight_kg: body.weight ?? body.weightKg ?? body.weight_kg ?? null,
      dimensions: body.dimensions || null,
      image_url: body.imageUrl ?? body.image_url ?? null,
      min_stock: body.minStock ?? body.min_stock ?? 10,
      notes: body.notes || null,
    };

    const { data, error } = await supabase
      .from("products")
      .update(dbData)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}