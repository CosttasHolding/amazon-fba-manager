import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const productUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  sku: z.string().min(1).max(100).optional(),
  asin: z.string().max(100).nullable().optional(),
  category: z.string().nullable().optional(),
  status: z.enum(["active","paused","discontinued"]).optional(),
  marketplace: z.string().max(10).optional(),
  unit_cost: z.coerce.number().min(0).optional(),
  sale_price: z.coerce.number().min(0).optional(),
  fba_fee: z.coerce.number().min(0).optional(),
  referral_fee: z.coerce.number().min(0).optional(),
  shipping_cost: z.coerce.number().min(0).optional(),
  storage_fee_monthly: z.coerce.number().min(0).optional(),
  prep_cost: z.coerce.number().min(0).optional(),
  taxes: z.coerce.number().min(0).optional(),
  other_fees: z.coerce.number().min(0).optional(),
  weight_kg: z.coerce.number().min(0).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

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
    if (message.includes("PGRST116") || message.toLowerCase().includes("no rows") || message.toLowerCase().includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
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
    const parse = productUpdateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: "Datos inv\u00E1lidos", details: parse.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const v = parse.data;
    const dbData: Record<string, unknown> = {};
    if (v.name !== undefined) dbData.name = v.name;
    if (v.sku !== undefined) dbData.sku = v.sku;
    if (v.asin !== undefined) dbData.asin = v.asin;
    if (v.category !== undefined) dbData.category = v.category;
    if (v.status !== undefined) dbData.status = v.status;
    if (v.marketplace !== undefined) dbData.marketplace = v.marketplace;
    if (v.unit_cost !== undefined) dbData.unit_cost = v.unit_cost;
    if (v.sale_price !== undefined) dbData.sale_price = v.sale_price;
    if (v.fba_fee !== undefined) dbData.fba_fee = v.fba_fee;
    if (v.referral_fee !== undefined) dbData.referral_fee = v.referral_fee;
    if (v.shipping_cost !== undefined) dbData.shipping_cost = v.shipping_cost;
    if (v.storage_fee_monthly !== undefined) dbData.storage_fee_monthly = v.storage_fee_monthly;
    if (v.prep_cost !== undefined) dbData.prep_cost = v.prep_cost;
    if (v.taxes !== undefined) dbData.taxes = v.taxes;
    if (v.other_fees !== undefined) dbData.other_fees = v.other_fees;
    if (v.weight_kg !== undefined) dbData.weight_kg = v.weight_kg;
    if (v.notes !== undefined) dbData.notes = v.notes;

    if (Object.keys(dbData).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

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
