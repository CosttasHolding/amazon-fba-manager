import { NextResponse } from "next/server";
import { createApiHandler, buildPagination, paginatedResponse } from "@/lib/api-handler";
import { auditLogSchema, auditLogQuerySchema } from "@/validations/audit-log";

export const GET = createApiHandler(async ({ supabase, orgId, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const { searchParams } = req.nextUrl;
  const parsed = auditLogQuerySchema.safeParse({
    entity: searchParams.get("entity") || undefined,
    action: searchParams.get("action") || undefined,
  });

  const filters = parsed.success ? parsed.data : {};
  const { page, perPage, from, to } = buildPagination(req, 50);

  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.entity) query = query.eq("entity", filters.entity);
  if (filters.action) query = query.eq("action", filters.action);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(paginatedResponse(data || [], count || 0, page, perPage));
});

export const POST = createApiHandler(async ({ supabase, user, orgId, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const body = await req.json();
  const parsed = auditLogSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { entity, entity_id, action, changes } = parsed.data;

  const { data, error } = await supabase
    .from("audit_log")
    .insert({
      user_id: user.id,
      org_id: orgId,
      entity,
      entity_id,
      action,
      changes,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
});
