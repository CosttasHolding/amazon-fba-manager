import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";

export const GET = createApiHandler(async ({ supabase, user }) => {
  const { data: memberships, error } = await supabase
    .from("org_members")
    .select("org_id, role, status, joined_at, organizations(*)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orgs = (memberships || [])
    .filter(m => m.organizations)
    .map(m => {
      const org = m.organizations as unknown as Record<string, unknown>;
      return {
        ...org,
        membership_role: m.role,
        joined_at: m.joined_at,
      };
    });

  return NextResponse.json({ data: orgs });
});

export const POST = createApiHandler(async ({ supabase, user, req }) => {
  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Nombre de organización requerido (mín. 2 caracteres)" }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  const existingSlug = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .single();

  const finalSlug = existingSlug.data ? `${slug}-${Date.now().toString(36)}` : slug;

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: name.trim(), slug: finalSlug, owner_id: user.id })
    .select()
    .single();

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 500 });
  }

  const { error: memberError } = await supabase
    .from("org_members")
    .insert({ org_id: org.id, user_id: user.id, role: "owner", status: "active" });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ data: org }, { status: 201 });
});
