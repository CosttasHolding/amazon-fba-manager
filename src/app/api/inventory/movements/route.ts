export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stockMovementSchema } from "@/validations/inventory";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = user.user_metadata?.org_id as string;
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const body = await req.json();
    const validated = stockMovementSchema.parse(body);

    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("id", validated.productId)
      .eq("org_id", orgId)
      .single();
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const dbData = {
      product_id: validated.productId,
      movement_type: validated.movementType,
      quantity: validated.quantity,
      reference: validated.reference || null,
      notes: validated.notes || null,
      user_id: user.id,
      org_id: orgId,
    };
    const { data, error } = await supabase
      .from("stock_movements")
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 400 });
  }
}
