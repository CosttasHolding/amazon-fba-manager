export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createApiHandler, buildPagination, paginatedResponse } from "@/lib/api-handler";
import { supplierSchema } from "@/validations/supplier";

export const GET = createApiHandler(async ({ supabase, orgId, req }) => {
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const country = searchParams.get("country") || "";
    const { page, perPage, from, to } = buildPagination(req, 50);

    let query = supabase
      .from("suppliers")
      .select("*", { count: "exact" })
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (search) {
      const cleanSearch = search.replace(/[%_]/g, '\\$&');
      query = query.or(
        `name.ilike.%${cleanSearch}%,contact_name.ilike.%${cleanSearch}%,country.ilike.%${cleanSearch}%`
      );
    }

    if (status) query = query.eq("status", status);
    if (country) query = query.eq("country", country);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json(paginatedResponse(data || [], count || 0, page, perPage));
});

export const POST = createApiHandler(async ({ supabase, user, orgId, req }) => {
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    const body = await req.json();
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
      org_id: orgId,
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

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
});
