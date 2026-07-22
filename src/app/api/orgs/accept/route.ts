export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";

export const POST = createApiHandler(async ({ supabase, user, req }) => {
  const body = await req.json();
  const { token } = body;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });
  }

  const { data: invite, error: inviteError } = await supabase
    .from("org_invitations")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (inviteError || !invite) {
    return NextResponse.json({ error: "Invitación no encontrada o ya utilizada" }, { status: 404 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    await supabase
      .from("org_invitations")
      .update({ status: "expired" })
      .eq("id", invite.id);
    return NextResponse.json({ error: "La invitación ha expirado" }, { status: 410 });
  }

  if (invite.email !== user.email) {
    return NextResponse.json({ error: "Esta invitación no es para tu cuenta" }, { status: 403 });
  }

  const { error: memberError } = await supabase
    .from("org_members")
    .insert({
      org_id: invite.org_id,
      user_id: user.id,
      role: invite.role,
      status: "active",
    });

  if (memberError) {
    if (memberError.code === "23505") {
      return NextResponse.json({ error: "Ya eres miembro de esta organización" }, { status: 409 });
    }
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  await supabase
    .from("org_invitations")
    .update({ status: "accepted" })
    .eq("id", invite.id);

  return NextResponse.json({ data: { success: true, org_id: invite.org_id } });
});
