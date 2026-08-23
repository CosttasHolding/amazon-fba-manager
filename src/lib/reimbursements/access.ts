import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function hasReimbursementEditorAccess(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
): Promise<boolean> {
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .eq("status", "active")
    .maybeSingle();

  return Boolean(membership && ["owner", "admin", "editor"].includes(membership.role));
}
