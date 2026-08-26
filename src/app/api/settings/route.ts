export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";
import { settingsUpdateSchema } from "@/validations/settings";

const SETTINGS_COLUMNS = [
  "id",
  "user_id",
  "full_name",
  "company",
  "country",
  "marketplace",
  "default_fba_fee",
  "default_referral_fee",
  "default_shipping_cost",
  "default_storage_cost",
  "target_roi",
  "currency",
  "tax_rate",
  "theme",
  "language",
  "avatar_url",
  "rate_usd_cny",
  "rate_usd_ars",
  "rates_updated_at",
  "high_contrast",
  "current_org_id",
  "created_at",
  "updated_at",
] as const;

const SETTINGS_SELECT = SETTINGS_COLUMNS.join(", ");

function safeSettings(data: unknown) {
  if (!data || typeof data !== "object") return data;

  const settings = data as Record<string, unknown>;

  return Object.fromEntries(
    SETTINGS_COLUMNS
      .filter((column) => settings[column] !== undefined)
      .map((column) => [column, settings[column]])
  );
}

export const GET = createApiHandler(async ({ supabase, user }) => {
  const { data, error } = await supabase
    .from("user_settings")
    .select(SETTINGS_SELECT)
    .eq("user_id", user.id)
    .single();

  if (error && error.code === "PGRST116") {
      const { data: newSettings, error: insertError } = await supabase
        .from("user_settings")
        .insert({ user_id: user.id })
        .select(SETTINGS_SELECT)
        .single();

    if (insertError) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
    return NextResponse.json(safeSettings(newSettings));
  }

  if (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }

  return NextResponse.json(safeSettings(data));
});

export const PUT = createApiHandler(async ({ supabase, user, req }) => {
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
    .eq("user_id", user.id)
    .single();

  if (!existing) {
      const { data, error } = await supabase
        .from("user_settings")
        .insert({ user_id: user.id, ...updateData })
        .select(SETTINGS_SELECT)
        .single();

    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
    return NextResponse.json(safeSettings(data));
  }

  const { data, error } = await supabase
    .from("user_settings")
    .update(updateData)
    .eq("user_id", user.id)
    .select(SETTINGS_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }

  return NextResponse.json(safeSettings(data));
});
