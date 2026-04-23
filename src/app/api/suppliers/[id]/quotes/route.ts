import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const quoteSchema = z.object({
  supplier_id: z.string().uuid(),
  product_id: z.string().uuid().nullable().optional(),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  unit_price: z.coerce.number().positive("El precio debe ser mayor a 0"),
  currency: z.string().max(3).default("USD"),
  valid_until: z.string().nullable().optional(),
  shipping_method: z.enum(["air", "sea", "express"]).nullable().optional(),
  shipping_cost: z.coerce.number().min(0).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(["pending", "accepted", "rejected", "expired"]).default("pending"),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("supplier_quotes")
      .select(`
        *,
        products:product_id(name, sku)
      `)
      .eq("supplier_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching quotes:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Quotes GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const result = quoteSchema.safeParse({ ...body, supplier_id: id });

    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inv\u00E1lidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const cleanData = {
      supplier_id: id,
      user_id: user.id,
      product_id: result.data.product_id || null,
      quantity: result.data.quantity,
      unit_price: result.data.unit_price,
      currency: result.data.currency,
      valid_until: result.data.valid_until || null,
      shipping_method: result.data.shipping_method || null,
      shipping_cost: result.data.shipping_cost || null,
      notes: result.data.notes || null,
      status: result.data.status,
    };

    const { data, error } = await supabase
      .from("supplier_quotes")
      .insert(cleanData)
      .select()
      .single();

    if (error) {
      console.error("Error creating quote:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Quotes POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const quoteId = searchParams.get("quoteId");

    if (!quoteId) {
      return NextResponse.json({ error: "quoteId requerido" }, { status: 400 });
    }

    const { error } = await supabase
      .from("supplier_quotes")
      .delete()
      .eq("id", quoteId)
      .eq("supplier_id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting quote:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Cotizaci\u00F3n eliminada" });
  } catch (error) {
    console.error("Quotes DELETE error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
