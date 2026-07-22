export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeAuthCode } from "@/lib/sp-api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("spapi_oauth_code");
    const marketplace = searchParams.get("marketplace") || "US";
    const state = searchParams.get("state");

    if (!code) {
      return NextResponse.redirect(
        new URL("/sp-api?error=no_code", req.url)
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", "/sp-api");
      return NextResponse.redirect(loginUrl);
    }

    const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
    const orgId = profile?.org_id;
    if (!orgId) return NextResponse.redirect(new URL("/sp-api?error=no_org", req.url));

    const origin = req.nextUrl.origin;
    const tokens = await exchangeAuthCode(code, origin);

    const { data: existing } = await supabase
      .from("sp_api_connections")
      .select("id")
      .eq("org_id", orgId)
      .eq("marketplace", marketplace)
      .maybeSingle();

    const connectionData = {
      user_id: user.id,
      org_id: orgId,
      marketplace,
      seller_id: state || "pending",
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      status: "active" as const,
    };

    if (existing) {
      await supabase
        .from("sp_api_connections")
        .update(connectionData)
        .eq("id", existing.id);
    } else {
      await supabase
        .from("sp_api_connections")
        .insert(connectionData);
    }

    return NextResponse.redirect(new URL("/sp-api?connected=true", req.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.redirect(
      new URL(`/sp-api?error=${encodeURIComponent(message)}`, req.url)
    );
  }
}
