import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOAuthUrl } from "@/lib/sp-api";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const origin = req.nextUrl.origin;
    const url = getOAuthUrl(origin);
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error generating auth URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
