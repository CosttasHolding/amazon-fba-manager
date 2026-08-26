export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { randomBytes } from "node:crypto";
import { getOrgId } from "@/lib/org-resolver";
import { hasOrgRole } from "@/lib/api-handler";
import { isDriveOrgAllowed } from "@/lib/drive";
import { DRIVE_OAUTH_STATE_COOKIE, getDriveRedirectUri } from "@/lib/drive/oauth";
import { createDriveOAuthState } from "@/lib/drive/oauth-state";
import { getDriveRootFolderIdForOrg } from "@/lib/drive/org-root-config";
import { enforceDriveRateLimit } from "@/lib/drive/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await enforceDriveRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = await getOrgId(supabase, user.id, request);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    if (!(await hasOrgRole(supabase, user.id, orgId, ["owner", "admin"]))) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }
    if (!isDriveOrgAllowed(orgId)) {
      return NextResponse.json({ error: "Drive no habilitado para esta organización" }, { status: 403 });
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "Google Drive OAuth no configurado" }, { status: 500 });
    }
    const rootFolderId = getDriveRootFolderIdForOrg(orgId);
    if (!rootFolderId) return NextResponse.json({ error: "Google Drive no configurado" }, { status: 500 });

    const redirectUri = getDriveRedirectUri(request.nextUrl.origin);

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const state = randomBytes(32).toString("hex");
    await createDriveOAuthState({ state, userId: user.id, orgId, rootFolderId });

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/drive"],
      state,
    });

    const response = NextResponse.redirect(url);
    response.cookies.set(DRIVE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/api/drive/auth",
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const safeMessage = message.startsWith("Google Drive OAuth") || message === "Google Drive no configurado"
      ? message
      : "No se pudo iniciar la conexión de Google Drive";
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
