export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/org-resolver";
import { hasOrgRole } from "@/lib/api-handler";
import { DRIVE_OAUTH_STATE_COOKIE, getDriveRedirectUri } from "@/lib/drive/oauth";
import { consumeDriveOAuthState } from "@/lib/drive/oauth-state";
import { isDriveOrgAllowed } from "@/lib/drive";
import { encryptDriveToken } from "@/lib/drive/crypto";
import { upsertDriveConnectionForOrg } from "@/lib/drive/connection-secrets";
import { enforceDriveRateLimit } from "@/lib/drive/rate-limit";
import {
  assertDriveRootIsolated,
  DriveRootIsolationError,
} from "@/lib/drive/root-isolation";

function redirectWithError(request: NextRequest, code: string) {
  const response = NextResponse.redirect(new URL(`/drive?error=${code}`, request.url));
  response.cookies.delete(DRIVE_OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await enforceDriveRateLimit(request);
  if (rateLimitResponse) {
    rateLimitResponse.cookies.delete(DRIVE_OAUTH_STATE_COOKIE);
    return rateLimitResponse;
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(DRIVE_OAUTH_STATE_COOKIE)?.value;
  if (!code) return redirectWithError(request, "no-code");
  if (!state || !expectedState || state !== expectedState) return redirectWithError(request, "invalid-state");

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return redirectWithError(request, "oauth-not-configured");

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete(DRIVE_OAUTH_STATE_COOKIE);
      return response;
    }
    const storedState = await consumeDriveOAuthState(state);
    if (!storedState || storedState.userId !== user.id || !storedState.rootFolderId.trim()) {
      return redirectWithError(request, "invalid-state");
    }

    const stateBoundRequest = {
      url: request.url,
      headers: {
        get: (name: string) => name.toLowerCase() === "x-org-id"
          ? storedState.orgId
          : request.headers.get(name),
      },
    };
    const orgId = await getOrgId(supabase, user.id, stateBoundRequest);
    if (!orgId) {
      return redirectWithError(request, "no-organization");
    }
    if (orgId !== storedState.orgId) {
      return redirectWithError(request, "invalid-state");
    }
    if (!(await hasOrgRole(supabase, user.id, orgId, ["owner", "admin"]))) {
      return redirectWithError(request, "insufficient-permissions");
    }
    if (!isDriveOrgAllowed(orgId)) {
      return redirectWithError(request, "drive-not-enabled");
    }

    let redirectUri: string;
    try {
      redirectUri = getDriveRedirectUri(request.nextUrl.origin);
    } catch {
      return redirectWithError(request, "oauth-redirect-not-configured");
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri,
    );

    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: "v3", auth: oauth2Client });
    try {
      await assertDriveRootIsolated(drive, supabase, user.id, orgId, storedState.rootFolderId);
    } catch (error) {
      if (error instanceof DriveRootIsolationError) {
        return redirectWithError(request, "drive-not-enabled");
      }
      throw error;
    }

    if (typeof tokens.refresh_token !== "string" || tokens.refresh_token.trim().length === 0) {
      return redirectWithError(request, "no-refresh-token");
    }

    let encryptedToken: string;
    try {
      encryptedToken = encryptDriveToken(tokens.refresh_token);
    } catch {
      return redirectWithError(request, "save-failed");
    }

    try {
      await upsertDriveConnectionForOrg(
        supabase,
        user.id,
        orgId,
        storedState.rootFolderId,
        encryptedToken,
      );
    } catch {
      return redirectWithError(request, "save-failed");
    }

    const response = NextResponse.redirect(new URL("/drive?connected=true", request.url));
    response.cookies.delete(DRIVE_OAUTH_STATE_COOKIE);
    return response;
  } catch {
    return redirectWithError(request, "auth-failed");
  }
}
