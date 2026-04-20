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

    var uc = data.unit_cost ?? 0;
    var sp = data.sale_price ?? 0;
    var ff = data.fba_fee ?? 0;
    var rf = data.referral_fee ?? 0;
    var sc = data.shipping_cost ?? 0;
    var sf = data.storage_fee_monthly ?? 0;
    var pc = data.prep_cost ?? 0;
    var tx = data.taxes ?? 0;
    var of2 = data.other_fees ?? 0;
    var totalCost = uc + sc + pc + tx;
    var totalFees = ff + rf + sf + of2;
    var profitVal = sp - totalCost - totalFees;
    var roiVal = totalCost > 0 ? (profitVal / totalCost) * 100 : 0;
    var marginVal = sp > 0 ? (profitVal / sp) * 100 : 0;

    var enriched = Object.assign({}, data, {
      buy_cost: uc,
      sell_price: sp,
      unit_cost: uc,
      sale_price: sp,
      storage_cost: sf,
      storage_fee_monthly: sf,
      fba_fee: ff,
      referral_fee: rf,
      shipping_cost: sc,
      prep_cost: pc,
      taxes: tx,
      other_fees: of2,
      weight: data.weight_kg ?? 0,
      weight_kg: data.weight_kg ?? 0,
      units_purchased: data.units_purchased ?? 0,
      current_stock: data.stock_available ?? 0,
      reorder_point: data.reorder_point ?? 10,
      profit: profitVal,
      roi: roiVal,
      margin: marginVal,
    });

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

    var dbData: Record<string, any> = {
      name: body.name,
      sku: body.sku,
      asin: body.asin || null,
      category: body.category || null,
      status: body.status || "active",
      marketplace: body.marketplace || "US",
      unit_cost: body.unitCost ?? body.unit_cost ?? 0,
      sale_price: body.salePrice ?? body.sale_price ?? 0,
      fba_fee: body.fbaFee ?? body.fba_fee ?? 0,
      referral_fee: body.referralFee ?? body.referral_fee ?? 0,
      shipping_cost: body.shippingCost ?? body.shipping_cost ?? 0,
      storage_fee_monthly: body.storageCost ?? body.storage_fee_monthly ?? 0,
      prep_cost: body.prepCost ?? body.prep_cost ?? 0,
      taxes: body.taxes ?? 0,
      other_fees: body.otherFees ?? body.other_fees ?? 0,
      weight_kg: body.weight ?? body.weight_kg ?? null,
      units_purchased: body.unitsPurchased ?? body.units_purchased ?? 0,
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