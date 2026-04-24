import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const saveSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(200),
  product_id: z.string().uuid().nullable().optional(),
  sale_price: z.coerce.number().min(0).nullable().optional(),
  unit_cost: z.coerce.number().min(0).nullable().optional(),
  shipping_cost: z.coerce.number().min(0).nullable().optional(),
  prep_cost: z.coerce.number().min(0).nullable().optional(),
  taxes: z.coerce.number().min(0).nullable().optional(),
  weight_kg: z.coerce.number().min(0).nullable().optional(),
  fba_fee: z.coerce.number().min(0).nullable().optional(),
  referral_fee: z.coerce.number().min(0).nullable().optional(),
  other_fees: z.coerce.number().min(0).nullable().optional(),
  ppc_budget: z.coerce.number().min(0).nullable().optional(),
  net_profit: z.coerce.number().nullable().optional(),
  roi: z.coerce.number().nullable().optional(),
  margin: z.coerce.number().nullable().optional(),
  total_cost: z.coerce.number().min(0).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const result = saveSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inv\u00E1lidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const cleanData = {
      user_id: user.id,
      name: result.data.name,
      product_id: result.data.product_id || null,
      sale_price: result.data.sale_price ?? null,
      unit_cost: result.data.unit_cost ?? null,
      shipping_cost: result.data.shipping_cost ?? null,
      prep_cost: result.data.prep_cost ?? null,
      taxes: result.data.taxes ?? null,
      weight_kg: result.data.weight_kg ?? null,
      fba_fee: result.data.fba_fee ?? null,
      referral_fee: result.data.referral_fee ?? null,
      other_fees: result.data.other_fees ?? null,
      ppc_budget: result.data.ppc_budget ?? null,
      net_profit: result.data.net_profit ?? null,
      roi: result.data.roi ?? null,
      margin: result.data.margin ?? null,
      total_cost: result.data.total_cost ?? null,
      notes: result.data.notes || null,
    };

    const { data, error } = await supabase
      .from("saved_calculations")
      .insert(cleanData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("saved_calculations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
