import { NextRequest, NextResponse } from "next/server";
import { createApiHandler, buildPagination, paginatedResponse } from "@/lib/api-handler";
import { orderSchema } from "@/validations/order";

export const GET = createApiHandler(async ({ supabase, orgId, req }) => {
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const { page, perPage, from, to } = buildPagination(req, 50);

    let query = supabase
      .from("purchase_orders")
      .select("*, suppliers(name), products(name, sku)", { count: "exact" })
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) query = query.eq("status", status);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json(paginatedResponse(data || [], count || 0, page, perPage));
});

export const POST = createApiHandler(async ({ supabase, user, orgId, req }) => {
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    const body = await req.json();
    const result = orderSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Datos inválidos", details: result.error.flatten().fieldErrors }, { status: 400 });
    }

    const clean = { ...result.data, user_id: user.id, org_id: orgId };
    const { data, error } = await supabase.from("purchase_orders").insert(clean).select().single();
    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
});
