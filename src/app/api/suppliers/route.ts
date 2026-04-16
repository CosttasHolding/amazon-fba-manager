import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supplierSchema } from "@/validations/supplier";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const country = searchParams.get("country") || "";

    let query = supabase
      .from("suppliers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,contact_name.ilike.%${search}%,country.ilike.%${search}%`
      );
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (country) {
      query = query.eq("country", country);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching suppliers:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Suppliers GET error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const result = supplierSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const cleanData = {
      ...result.data,
      user_id: user.id,
      alibaba_url: result.data.alibaba_url || null,
      contact_name: result.data.contact_name || null,
      contact_email: result.data.contact_email || null,
      contact_whatsapp: result.data.contact_whatsapp || null,
      country: result.data.country || null,
      rating: result.data.rating ?? null,
      payment_terms: result.data.payment_terms || null,
      min_order_qty: result.data.min_order_qty ?? null,
      lead_time_days: result.data.lead_time_days ?? null,
      notes: result.data.notes || null,
    };

    const { data, error } = await supabase
      .from("suppliers")
      .insert(cleanData)
      .select()
      .single();

    if (error) {
      console.error("Error creating supplier:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Suppliers POST error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
