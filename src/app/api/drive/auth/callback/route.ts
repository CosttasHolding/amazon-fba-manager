export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/org-resolver";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/drive?error=no-code", request.url));
  }

  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/drive/auth/callback`;

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL("/drive?error=no-refresh-token", request.url));
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const orgId = await getOrgId(supabase, user.id, request);
    if (!orgId) {
      return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: user.id, drive_refresh_token: tokens.refresh_token },
        { onConflict: "user_id" }
      );

    if (error) {
      return NextResponse.redirect(new URL("/drive?error=save-failed", request.url));
    }

    return NextResponse.redirect(new URL("/drive?connected=true", request.url));
  } catch (err) {
    console.error("Drive OAuth callback error:", err);
    return NextResponse.redirect(new URL("/drive?error=auth-failed", request.url));
  }
}
