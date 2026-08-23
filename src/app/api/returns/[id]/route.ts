export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/api-handler";
import { isValidUuid } from "@/lib/api-utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildRateLimitKey, rateLimit } from "@/lib/rate-limit";

const returnStatusSchema = z.enum([
  "requested",
  "received_at_customer",
  "in_transit",
  "received_at_fc",
  "inspected",
  "refunded",
  "reimbursed",
  "disposed",
]);
const nullableDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida").nullable().optional();

const returnUpdateSchema = z.object({
  status: returnStatusSchema.optional(),
  disposition: z.enum(["sellable", "unsellable", "pending"]).nullable().optional(),
  customer_comment: z.string().max(1000).nullable().optional(),
  refund_amount: z.coerce.number().min(0).optional(),
  received_date: nullableDateSchema,
  inspected_date: nullableDateSchema,
  notes: z.string().max(2000).nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };
type AuthenticatedContext =
  | { response: NextResponse; supabase?: never; orgId?: never; userId?: never }
  | { response?: never; supabase: SupabaseClient; orgId: string; userId: string };

async function enforceRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const result = await rateLimit(buildRateLimitKey(ip, req.nextUrl.pathname), 60, 60000);
  if (result.allowed) return null;
  return NextResponse.json(
    { error: "Demasiadas solicitudes. Intente nuevamente más tarde." },
    { status: 429, headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } },
  );
}

async function getAuthenticatedContext(req: NextRequest, id: string): Promise<AuthenticatedContext> {
  if (!isValidUuid(id)) {
    return { response: NextResponse.json({ error: "ID inválido" }, { status: 400 }) };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }

  const orgId = await getOrgId(supabase, user.id, req);
  if (!orgId) {
    return { response: NextResponse.json({ error: "No hay organización activa" }, { status: 400 }) };
  }

  return { supabase, orgId, userId: user.id };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const rateLimitResponse = await enforceRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;
    const { id } = await params;
    const context = await getAuthenticatedContext(req, id);
    if (context.response) return context.response;

    const { data, error } = await context.supabase
      .from("returns")
      .select("*, products(name, sku)")
      .eq("id", id)
      .eq("org_id", context.orgId)
      .single();

    if (error || !data) return NextResponse.json({ error: "Devolución no encontrada" }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Return detail GET error", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const rateLimitResponse = await enforceRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;
    const { id } = await params;
    const context = await getAuthenticatedContext(req, id);
    if (context.response) return context.response;

    const { data: membership } = await context.supabase
      .from("org_members")
      .select("role")
      .eq("user_id", context.userId)
      .eq("org_id", context.orgId)
      .eq("status", "active")
      .maybeSingle();
    if (!membership || !["owner", "admin", "editor"].includes(membership.role)) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = returnUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const { data, error } = await context.supabase
      .from("returns")
      .update(parsed.data)
      .eq("id", id)
      .eq("org_id", context.orgId)
      .select()
      .single();

    if (error || !data) return NextResponse.json({ error: "Devolución no encontrada" }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Return detail PUT error", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
