import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";

export const GET = createApiHandler(async ({ supabase, orgId }) => {
  if (!orgId) {
    return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
  }

  const { data: invitations, error } = await supabase
    .from("org_invitations")
    .select("*, organizations(name)")
    .eq("org_id", orgId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: invitations || [] });
});

export const POST = createApiHandler(async ({ supabase, orgId, user, req }) => {
  if (!orgId) {
    return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "No tienes permisos para invitar" }, { status: 403 });
  }

  const body = await req.json();
  const { email, role = "editor" } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const { data: existingMember } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (existingMember) {
    const { data: alreadyMember } = await supabase
      .from("org_members")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", existingMember.id)
      .eq("status", "active")
      .single();

    if (alreadyMember) {
      return NextResponse.json({ error: "El usuario ya es miembro" }, { status: 409 });
    }

    const { error: insertError } = await supabase
      .from("org_members")
      .insert({ org_id: orgId, user_id: existingMember.id, role, status: "active" });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true, method: "direct_add" } }, { status: 201 });
  }

  const { data: existingInvite } = await supabase
    .from("org_invitations")
    .select("id")
    .eq("org_id", orgId)
    .eq("email", email)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (existingInvite) {
    return NextResponse.json({ error: "Ya existe una invitación pendiente para este email" }, { status: 409 });
  }

  const { data: invite, error: inviteError } = await supabase
    .from("org_invitations")
    .insert({
      org_id: orgId,
      email,
      role,
      invited_by: user.id,
    })
    .select()
    .single();

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { success: true, method: "invitation", token: invite.token } }, { status: 201 });
});

export const DELETE = createApiHandler(async ({ supabase, orgId, user, req }) => {
  if (!orgId) {
    return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const inviteId = searchParams.get("inviteId");

  if (!inviteId) {
    return NextResponse.json({ error: "inviteId requerido" }, { status: 400 });
  }

  const { error: revokeError } = await supabase
    .from("org_invitations")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("org_id", orgId);

  if (revokeError) {
    return NextResponse.json({ error: revokeError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { success: true } });
});
