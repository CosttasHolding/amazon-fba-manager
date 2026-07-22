import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";
import { settingsUpdateSchema } from "@/validations/settings";

export const GET = createApiHandler(async ({ supabase, user, orgId }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("org_id", orgId)
    .single();

  if (error && error.code === "PGRST116") {
    const { data: newSettings, error: insertError } = await supabase
      .from("user_settings")
      .insert({ user_id: user.id, org_id: orgId })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
    return NextResponse.json(newSettings);
  }

  if (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }

  return NextResponse.json(data);
});

export const PUT = createApiHandler(async ({ supabase, user, orgId, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const body = await req.json();
  const parsed = settingsUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updateData = parsed.data;

  const { data: existing } = await supabase
    .from("user_settings")
    .select("id")
    .eq("org_id", orgId)
    .single();

  if (!existing) {
    const { data, error } = await supabase
      .from("user_settings")
      .insert({ user_id: user.id, org_id: orgId, ...updateData })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from("user_settings")
    .update(updateData)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }

  return NextResponse.json(data);
});
