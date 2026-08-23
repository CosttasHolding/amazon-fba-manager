export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createApiHandler, getOrgId } from "@/lib/api-handler";
import { calculateNextRunAt } from "@/lib/schedules";

const scheduleFieldsSchema = z.object({
  name: z.string().trim().min(1).max(200),
  template: z.enum(["profitability", "inventory", "sales-summary", "roi-ranking"]),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  day_of_month: z.number().int().min(1).max(31).nullable().optional(),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/),
  channel: z.enum(["email", "in_app", "both"]),
  recipients: z.array(z.string().email()).max(50),
  format: z.literal("excel"),
  enabled: z.boolean(),
}).strict();

const createScheduleSchema = scheduleFieldsSchema.extend({
  channel: z.enum(["email", "in_app", "both"]).default("email"),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/).default("08:00"),
  recipients: z.array(z.string().email()).max(50).default([]),
  format: z.literal("excel").default("excel"),
  enabled: z.boolean().default(true),
});

const updateScheduleSchema = z.object({
  id: z.string().uuid(),
  ...scheduleFieldsSchema.partial().shape,
}).strict();

export const GET = createApiHandler(async ({ supabase, orgId }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const { data, error } = await supabase
    .from("scheduled_reports")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
});

export const POST = createApiHandler(async ({ supabase, user, orgId, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const parsed = createScheduleSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de programación inválidos" }, { status: 400 });
  }
  const schedule = parsed.data;

  const { data, error } = await supabase
    .from("scheduled_reports")
    .insert({
      name: schedule.name,
      template: schedule.template,
      frequency: schedule.frequency,
      day_of_week: schedule.day_of_week ?? null,
      day_of_month: schedule.day_of_month ?? null,
      time: schedule.time,
      channel: schedule.channel,
      recipients: schedule.recipients,
      format: schedule.format,
      enabled: schedule.enabled,
      next_run_at: calculateNextRunAt(schedule),
      user_id: user.id,
      org_id: orgId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
});

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const parsed = updateScheduleSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de actualización inválidos" }, { status: 400 });
    }

    const { id, ...rawUpdates } = parsed.data;
    const { data: current, error: currentError } = await supabase
      .from("scheduled_reports")
      .select("name,template,frequency,day_of_week,day_of_month,time,channel,recipients,format,enabled")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();

    if (currentError) return NextResponse.json({ error: currentError.message }, { status: 500 });
    if (!current) return NextResponse.json({ error: "Reporte programado no encontrado" }, { status: 404 });

    const merged = {
      name: rawUpdates.name ?? current.name,
      template: rawUpdates.template ?? current.template,
      frequency: rawUpdates.frequency ?? current.frequency,
      day_of_week: "day_of_week" in rawUpdates ? rawUpdates.day_of_week : current.day_of_week,
      day_of_month: "day_of_month" in rawUpdates ? rawUpdates.day_of_month : current.day_of_month,
      time: rawUpdates.time ?? current.time,
      channel: rawUpdates.channel ?? current.channel,
      recipients: rawUpdates.recipients ?? current.recipients,
      format: rawUpdates.format ?? current.format,
      enabled: rawUpdates.enabled ?? current.enabled,
    };
    const mergedSchedule = createScheduleSchema.safeParse(merged);
    if (!mergedSchedule.success) {
      return NextResponse.json({ error: "El reporte programado existente es inválido" }, { status: 500 });
    }

    const schedule = mergedSchedule.data;
    const updates = {
      ...schedule,
      next_run_at: calculateNextRunAt(schedule),
    };

    const { data, error } = await supabase
      .from("scheduled_reports")
      .update(updates)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { searchParams } = req.nextUrl;
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const { error } = await supabase
      .from("scheduled_reports")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
