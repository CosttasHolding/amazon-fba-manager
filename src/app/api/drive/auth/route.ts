export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { getOrgId } from "@/lib/org-resolver";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = await getOrgId(supabase, user.id, request);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/drive/auth/callback`;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirectUri
    );

    if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
      return NextResponse.json({ error: "Google Drive OAuth no configurado" }, { status: 500 });
    }

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/drive"],
    });

    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error iniciando autenticacion de Google Drive";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
