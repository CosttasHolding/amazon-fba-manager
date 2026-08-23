export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/org-resolver";
import { DRIVE_OAUTH_STATE_COOKIE, getDriveRedirectUri } from "@/lib/drive/oauth";
import { isDriveOrgAllowed } from "@/lib/drive";

function redirectWithError(request: NextRequest, code: string) {
  const response = NextResponse.redirect(new URL(`/drive?error=${code}`, request.url));
  response.cookies.delete(DRIVE_OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(DRIVE_OAUTH_STATE_COOKIE)?.value;
  if (!code) return redirectWithError(request, "no-code");
  if (!state || !expectedState || state !== expectedState) return redirectWithError(request, "invalid-state");

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return redirectWithError(request, "oauth-not-configured");

  const redirectUri = getDriveRedirectUri(request.nextUrl.origin);

  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return redirectWithError(request, "no-refresh-token");
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete(DRIVE_OAUTH_STATE_COOKIE);
      return response;
    }
    const orgId = await getOrgId(supabase, user.id, request);
    if (!orgId) {
      return redirectWithError(request, "no-organization");
    }
    if (!isDriveOrgAllowed(orgId)) {
      return redirectWithError(request, "drive-not-enabled");
    }

    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: user.id, drive_refresh_token: tokens.refresh_token },
        { onConflict: "user_id" }
      );

    if (error) {
      return redirectWithError(request, "save-failed");
    }

    const response = NextResponse.redirect(new URL("/drive?connected=true", request.url));
    response.cookies.delete(DRIVE_OAUTH_STATE_COOKIE);
    return response;
  } catch (err) {
    console.error("Drive OAuth callback error:", err);
    return redirectWithError(request, "auth-failed");
  }
}
