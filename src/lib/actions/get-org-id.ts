import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function getOrgId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("No autorizado");
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("joined_at", { ascending: true })
    .limit(1)
    .single();

  if (membership) {
    return membership.org_id;
  }

  const admin = createServiceRoleClient();
  const slug = "org-" + user.id.replace(/-/g, "") + "-default";

  const { data: existing } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    await admin
      .from("org_members")
      .insert({ org_id: existing.id, user_id: user.id, role: "owner", status: "active" })
      .select()
      .single();
    return existing.id;
  }

  const { data: newOrg } = await admin
    .from("organizations")
    .insert({ name: "Mi Organización", slug, owner_id: user.id })
    .select("id")
    .single();

  if (!newOrg) {
    throw new Error("No se pudo crear la organización");
  }

  await admin
    .from("org_members")
    .insert({ org_id: newOrg.id, user_id: user.id, role: "owner", status: "active" });

  return newOrg.id;
}
