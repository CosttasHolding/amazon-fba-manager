export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { MembersTable } from "@/components/members-table";
import { Member } from "@/types";

export default async function MembersPage() {
  const supabase = await createClient();
  const { data: members } = await supabase.from("members").select("*").order("full_name");

  return <MembersTable members={(members || []) as Member[]} />;
}
