import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function resolveOrgId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: true })
    .limit(1)
    .single();

  if (membership) {
    return membership.org_id;
  }

  const admin = createServiceRoleClient();
  const slug = "org-" + userId.replace(/-/g, "") + "-default";

  const { data: existing } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    await admin
      .from("org_members")
      .insert({ org_id: existing.id, user_id: userId, role: "owner", status: "active" });
    return existing.id;
  }

  const { data: newOrg } = await admin
    .from("organizations")
    .insert({ name: "Mi Organización", slug, owner_id: userId })
    .select("id")
    .single();

  if (!newOrg) {
    return null;
  }

  await admin
    .from("org_members")
    .insert({ org_id: newOrg.id, user_id: userId, role: "owner", status: "active" });

  return newOrg.id;
}
