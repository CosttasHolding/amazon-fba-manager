import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const campaignSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  campaign_name: z.string().min(1).max(200),
  campaign_id: z.string().max(100).nullable().optional(),
  campaign_type: z.enum(["sp_auto","sp_manual_keyword","sp_manual_product","sb","sd"]).default("sp_auto"),
  marketplace: z.string().max(10).default("US"),
  status: z.enum(["enabled","paused","archived"]).default("enabled"),
  daily_budget: z.coerce.number().min(0).default(0),
});

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

    const { data, error, count } = await supabase.from("ppc_campaigns").select("*", { count: "exact" }).eq("user_id", user.id).order("created_at", { ascending: false }).range(from, to);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [], count, page, limit });
  } catch { return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const result = campaignSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Datos invalidos", details: result.error.flatten().fieldErrors }, { status: 400 });

    const clean = { ...result.data, user_id: user.id };
    const { data, error } = await supabase.from("ppc_campaigns").insert(clean).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch { return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}
