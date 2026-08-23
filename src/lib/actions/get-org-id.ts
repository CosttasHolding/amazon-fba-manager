import { createClient } from "@/lib/supabase/server";
import { resolveOrgId } from "@/lib/org-resolver";

export async function getOrgId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("No autorizado");
  }

  const orgId = await resolveOrgId(supabase, user.id);

  if (!orgId) {
    throw new Error("No hay una organización activa");
  }

  return orgId;
}
