import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("product_suppliers")
      .select(`
        id,
        unit_cost,
        moq,
        lead_time_days,
        is_primary,
        notes,
        created_at,
        suppliers (
          id,
          name,
          contact_name,
          contact_email,
          contact_whatsapp,
          country,
          alibaba_url,
          rating,
          payment_terms,
          min_order_qty,
          lead_time_days,
          status
        )
      `)
      .eq("product_id", params.id)
      .order("is_primary", { ascending: false });

    if (error) {
      console.error("Error fetching product suppliers:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Product suppliers GET error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { supplier_id, unit_cost, moq, lead_time_days, is_primary, notes } = body;

    if (!supplier_id) {
      return NextResponse.json({ error: "supplier_id es requerido" }, { status: 400 });
    }

    const { data: supplier } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", supplier_id)
      .eq("user_id", user.id)
      .single();

    if (!supplier) {
      return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    }

    if (is_primary) {
      await supabase
        .from("product_suppliers")
        .update({ is_primary: false })
        .eq("product_id", params.id);
    }

    const { data: existing } = await supabase
      .from("product_suppliers")
      .select("id")
      .eq("product_id", params.id)
      .eq("supplier_id", supplier_id)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from("product_suppliers")
        .update({
          unit_cost: unit_cost || 0,
          moq: moq || null,
          lead_time_days: lead_time_days || null,
          is_primary: is_primary || false,
          notes: notes || null,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    }

    const { data, error } = await supabase
      .from("product_suppliers")
      .insert({
        product_id: params.id,
        supplier_id,
        unit_cost: unit_cost || 0,
        moq: moq || null,
        lead_time_days: lead_time_days || null,
        is_primary: is_primary || false,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplier_id");

    if (!supplierId) {
      return NextResponse.json({ error: "supplier_id es requerido" }, { status: 400 });
    }

    const { error } = await supabase
      .from("product_suppliers")
      .delete()
      .eq("product_id", params.id)
      .eq("supplier_id", supplierId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}