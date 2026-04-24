import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { researchSchema } from "@/validations/research";
import { apiErrorResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase.from("product_research").select("*", { count: "exact" }).eq("user_id", user.id).order("created_at", { ascending: false }).range(from, to);
    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
    return NextResponse.json({ data: data || [], count, page, limit });
  } catch (error) {
    return apiErrorResponse(error, 500, "GET /api/research");
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const result = researchSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Datos inválidos", details: result.error.flatten().fieldErrors }, { status: 400 });

    const clean = { ...result.data, user_id: user.id };
    const { data, error } = await supabase.from("product_research").insert(clean).select().single();
    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 500, "POST /api/research");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const body = await req.json();
    const result = researchSchema.partial().safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

    const { data, error } = await supabase.from("product_research").update(result.data).eq("id", id).eq("user_id", user.id).select().single();
    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error, 500, "PUT /api/research");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const { error } = await supabase.from("product_research").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
    return NextResponse.json({ message: "Eliminado" });
  } catch (error) {
    return apiErrorResponse(error, 500, "DELETE /api/research");
  }
}
