export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createApiHandler, buildPagination, paginatedResponse } from "@/lib/api-handler";

export const GET = createApiHandler(async ({ supabase, orgId, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const { searchParams } = req.nextUrl;
  const read = searchParams.get("read");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const { from, to } = buildPagination(req, 50);

  let query = supabase
    .from("alert_history")
    .select("*", { count: "exact" })
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (read === "true") query = query.eq("read", true);
  else if (read === "false") query = query.eq("read", false);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { page, perPage } = buildPagination(req, 50);
  return NextResponse.json(paginatedResponse(data || [], count || 0, page, perPage));
});

export const PATCH = createApiHandler(async ({ supabase, orgId, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const body = await req.json();
  const { ids } = body;

  if (!ids || !Array.isArray(ids)) {
    return NextResponse.json({ error: "Array de IDs requerido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("alert_history")
    .update({ read: true })
    .in("id", ids)
    .eq("org_id", orgId)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
});
