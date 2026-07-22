export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";

export const GET = createApiHandler(async ({ supabase, orgId }) => {
  if (!orgId) {
    return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
  }

  const { data: members, error } = await supabase
    .from("org_members")
    .select("id, org_id, user_id, role, status, joined_at, profiles(id, full_name, email)")
    .eq("org_id", orgId)
    .order("joined_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formatted = (members || []).map(m => {
    const profile = m.profiles as { email?: string; full_name?: string } | null;
    return {
      id: m.id,
      org_id: m.org_id,
      user_id: m.user_id,
      role: m.role,
      status: m.status,
      joined_at: m.joined_at,
      user_email: profile?.email || null,
      user_name: profile?.full_name || null,
    };
  });

  return NextResponse.json({ data: formatted });
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
    return NextResponse.json({ error: "No tienes permisos para agregar miembros" }, { status: 403 });
  }

  const body = await req.json();
  const { user_email, role = "editor" } = body;

  if (!user_email || typeof user_email !== "string") {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", user_email)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Usuario no encontrado. Debe registrarse primero." }, { status: 404 });
  }

  const { error: insertError } = await supabase
    .from("org_members")
    .insert({ org_id: orgId, user_id: profile.id, role, status: "active" });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "El usuario ya es miembro de esta organización" }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { success: true } }, { status: 201 });
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
    return NextResponse.json({ error: "No tienes permisos para eliminar miembros" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const memberId = searchParams.get("memberId");

  if (!memberId) {
    return NextResponse.json({ error: "memberId requerido" }, { status: 400 });
  }

  const { data: targetMember } = await supabase
    .from("org_members")
    .select("role, user_id")
    .eq("id", memberId)
    .eq("org_id", orgId)
    .single();

  if (!targetMember) {
    return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
  }

  if (targetMember.role === "owner") {
    return NextResponse.json({ error: "No se puede eliminar al propietario" }, { status: 400 });
  }

  if (membership.role !== "owner" && targetMember.role === "admin") {
    return NextResponse.json({ error: "Solo el propietario puede eliminar administradores" }, { status: 403 });
  }

  const { error: deleteError } = await supabase
    .from("org_members")
    .delete()
    .eq("id", memberId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { success: true } });
});
