"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "./get-org-id";
import { z } from "zod";
import { memberSchema as formSchema } from "@/validations/member";

export async function createMember(data: {
  full_name: string;
  email?: string | null;
  ownership_pct?: number;
  status?: "active" | "deceased" | "retired";
  role?: "admin" | "editor" | "viewer";
  executor_name?: string | null;
  executor_email?: string | null;
  notes?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const orgId = await getOrgId();

  const parse = formSchema.safeParse(data);
  if (!parse.success) throw new Error("Datos inválidos");

  const { data: inserted, error } = await supabase.from("members").insert({
    ...parse.data,
    user_id: user.id,
    org_id: orgId,
  }).select().single();

  if (error) throw error;

  await supabase.from("audit_log").insert({
    user_id: user.id,
    entity: "member",
    entity_id: inserted.id,
    action: "create",
    changes: parse.data,
  });

  return { success: true };
}

export async function updateMember(id: string, data: z.infer<typeof formSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const parse = formSchema.partial().safeParse(data);
  if (!parse.success) throw new Error("Datos inválidos");

  const { error } = await supabase
    .from("members")
    .update(parse.data)
    .eq("id", id);

  if (error) throw error;

  await supabase.from("audit_log").insert({
    user_id: user.id,
    entity: "member",
    entity_id: id,
    action: "update",
    changes: parse.data,
  });

  return { success: true };
}

export async function deleteMember(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { error } = await supabase
    .from("members")
    .delete()
    .eq("id", id);

  if (error) throw error;

  await supabase.from("audit_log").insert({
    user_id: user.id,
    entity: "member",
    entity_id: id,
    action: "delete",
  });

  return { success: true };
}
