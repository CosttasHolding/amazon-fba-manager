export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/actions/get-org-id";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const orgId = await getOrgId();

  let locale: "es" | "en" = "es";
  if (user) {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("language")
      .eq("user_id", user.id)
      .single();
    if (settings?.language === "en") locale = "en";
  }

  const data = await getDashboardData(supabase, orgId, locale);

  return <DashboardClient initialData={data} />;
}
