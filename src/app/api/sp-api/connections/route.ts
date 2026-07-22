import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
    const orgId = profile?.org_id;
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { data, error } = await supabase
      .from("sp_api_connections")
      .select("id, marketplace, seller_id, status, created_at, updated_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error fetching connections";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
