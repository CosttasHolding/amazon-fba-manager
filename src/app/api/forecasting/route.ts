import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getForecastSuggestions } from "@/lib/forecasting";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const suggestions = await getForecastSuggestions(user.id, supabase);
    return NextResponse.json(suggestions);
  } catch (err) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
