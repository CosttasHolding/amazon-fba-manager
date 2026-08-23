export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createApiHandler, buildPagination, paginatedResponse } from "@/lib/api-handler";
import { commentSchema, commentQuerySchema } from "@/validations/comment";

export const GET = createApiHandler(async ({ supabase, orgId, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
  const { searchParams } = req.nextUrl;
  const parsed = commentQuerySchema.safeParse({
    entity: searchParams.get("entity"),
    entity_id: searchParams.get("entity_id"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { entity, entity_id } = parsed.data;
  const { page, perPage, from, to } = buildPagination(req, 50);

  const { data, error, count } = await supabase
    .from("comments")
    .select("*, profiles:user_id(full_name, avatar_url)", { count: "exact" })
    .eq("entity", entity)
    .eq("entity_id", entity_id)
    .eq("org_id", orgId)
    .order("created_at", { ascending: true })
    .range(from, to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(paginatedResponse(data || [], count || 0, page, perPage));
});

export const POST = createApiHandler(async ({ supabase, user, orgId, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
  const body = await req.json();
  const parsed = commentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { entity, entity_id, content, parent_id } = parsed.data;

  const { data, error } = await supabase
    .from("comments")
    .insert({
      user_id: user.id,
      org_id: orgId,
      entity,
      entity_id,
      content,
      parent_id: parent_id || null,
    })
    .select("*, profiles:user_id(full_name, avatar_url)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
});

export const DELETE = createApiHandler(async ({ supabase, orgId, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
});
