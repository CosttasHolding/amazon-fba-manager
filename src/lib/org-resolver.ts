import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function getOrgId(
  supabase: SupabaseClient,
  userId: string,
  req?: { headers: { get: (name: string) => string | null }; url?: string }
): Promise<string | null> {
  if (req) {
    const headerOrgId = req.headers.get("x-org-id") || null;
    const queryOrgId = req.url ? new URL(req.url).searchParams.get("orgId") : null;
    const requestedOrgId = headerOrgId || queryOrgId;
    if (requestedOrgId) {
      const { data: membership } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", userId)
        .eq("org_id", requestedOrgId)
        .eq("status", "active")
        .maybeSingle();
      return membership ? requestedOrgId : null;
    }
  }
  return resolveOrgId(supabase, userId);
}

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

  return null;
}

export async function ensureDefaultOrg(userId: string): Promise<string | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc("ensure_default_org", { target_user_id: userId });
  return error || typeof data !== "string" ? null : data;
}
