"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "./get-org-id";
import { z } from "zod";
import { boardDecisionSchema as formSchema } from "@/validations/member";

export async function createBoardDecision(data: {
  title: string;
  doc_reference?: string | null;
  description?: string | null;
  decision_date?: string | null;
  voted_by?: Record<string, unknown> | null;
  status?: "draft" | "approved" | "rejected" | "executed";
  file_url?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const orgId = await getOrgId();

  const parse = formSchema.safeParse(data);
  if (!parse.success) throw new Error("Datos inválidos");

  const { error } = await supabase.from("board_decisions").insert({
    ...parse.data,
    user_id: user.id,
    org_id: orgId,
  }).select().single();

  if (error) throw error;
  return { success: true };
}

export async function updateBoardDecision(id: string, data: z.infer<typeof formSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const parse = formSchema.partial().safeParse(data);
  if (!parse.success) throw new Error("Datos inválidos");

  const { error } = await supabase
    .from("board_decisions")
    .update(parse.data)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  return { success: true };
}

export async function deleteBoardDecision(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { error } = await supabase
    .from("board_decisions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  return { success: true };
}
