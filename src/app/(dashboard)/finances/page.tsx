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

  interface Expense { id: string; category: string; description: string; amount: number; currency: string; expense_date: string; recurring: boolean; vendor: string | null; }
  interface Payout { id: string; payout_period_start: string; payout_period_end: string; amount: number; status: string; marketplace: string; }
  return (
    <FinancesClient
      initialExpenses={(expenses || []) as Expense[]}
      initialPayouts={(payouts || []) as Payout[]}
    />
  );
}
