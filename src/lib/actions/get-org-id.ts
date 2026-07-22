import { createClient } from "@/lib/supabase/server";

export async function getOrgId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("No autorizado");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (membershipError || !membership) {
    throw new Error("No se encontró organización. Crea una organización primero.");
  }

  return membership.org_id;
}
