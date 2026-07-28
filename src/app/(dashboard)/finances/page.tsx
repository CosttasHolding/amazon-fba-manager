export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/actions/get-org-id";
import { FinancesClient } from "@/components/finances-client";

export default async function FinancesPage() {
  const supabase = await createClient();
  const orgId = await getOrgId();

  const [{ data: expenses }, { data: payouts }] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .eq("org_id", orgId)
      .order("expense_date", { ascending: false }),
    supabase
      .from("amazon_payouts")
      .select("*")
      .eq("org_id", orgId)
      .order("payout_period_start", { ascending: false }),
  ]);

  return (
    <FinancesClient
      initialExpenses={(expenses || []) as any[]}
      initialPayouts={(payouts || []) as any[]}
    />
  );
}
