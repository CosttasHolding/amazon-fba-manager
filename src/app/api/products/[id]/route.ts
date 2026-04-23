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

    const uc = data.unit_cost ?? 0;
    const sp = data.sale_price ?? 0;
    const ff = data.fba_fee ?? 0;
    const rf = data.referral_fee ?? 0;
    const sc = data.shipping_cost ?? 0;
    const sf = data.storage_fee_monthly ?? 0;
    const pc = data.prep_cost ?? 0;
    const tx = data.taxes ?? 0;
    const of2 = data.other_fees ?? 0;
    const totalCost = uc + sc + pc + tx;
    const totalFees = ff + rf + sf + of2;
    const profitVal = sp - totalCost - totalFees;
    const roiVal = totalCost > 0 ? (profitVal / totalCost) * 100 : 0;
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
    };

    return NextResponse.json(enriched);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 404 });
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

    const dbData: Record<string, unknown> = {
      name: body.name,
      sku: body.sku,
      asin: body.asin || null,
      category: body.category || null,
      status: body.status || "active",
      marketplace: body.marketplace || "US",
      unit_cost: body.unitCost ?? 0,
      sale_price: body.salePrice ?? 0,
      fba_fee: body.fbaFee ?? 0,
      referral_fee: body.referralFee ?? 0,
      shipping_cost: body.shippingCost ?? 0,
      storage_fee_monthly: body.storageFeeMonthly ?? 0,
      prep_cost: body.prepCost ?? 0,
      taxes: body.taxes ?? 0,
      other_fees: body.otherFees ?? 0,
      weight_kg: body.weightKg ?? null,
      min_stock: body.minStock ?? 10,
      dimensions: body.dimensions || null,
      image_url: body.imageUrl || null,
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
