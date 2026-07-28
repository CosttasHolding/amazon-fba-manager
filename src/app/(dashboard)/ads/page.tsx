export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/actions/get-org-id";
import { AdsClient } from "@/components/ads-client";

export default async function AdsPage() {
  const supabase = await createClient();
  const orgId = await getOrgId();

  const { data: campaigns } = await supabase
    .from("ppc_campaigns")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return <AdsClient initialCampaigns={(campaigns || []) as any[]} />;
}
