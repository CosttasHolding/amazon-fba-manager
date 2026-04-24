import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stockMovementSchema } from "@/validations/inventory";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const validated = stockMovementSchema.parse(body);
    const dbData = {
      product_id: validated.productId,
      movement_type: validated.movementType,
      quantity: validated.quantity,
      reference: validated.reference || null,
      notes: validated.notes || null,
      user_id: user.id,
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
