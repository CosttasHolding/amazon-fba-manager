"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "./get-org-id";
import { taskSchema as formSchema } from "@/validations/member";

export async function createTask(data: {
  title: string;
  description?: string | null;
  status?: "pending" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high" | "urgent";
  assigned_to?: string | null;
  due_date?: string | null;
  module?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const orgId = await getOrgId();

  const parse = formSchema.safeParse(data);
  if (!parse.success) throw new Error("Datos inválidos");

  const { data: inserted, error } = await supabase.from("tasks").insert({
    ...parse.data,
    user_id: user.id,
    org_id: orgId,
    completed_at: parse.data.status === "completed" ? new Date().toISOString() : null,
  }).select().single();

  if (error) throw error;

  await supabase.from("audit_log").insert({
    user_id: user.id,
    entity: "task",
    entity_id: inserted.id,
    action: "create",
    changes: parse.data,
  });

  return { success: true };
}

export async function updateTask(id: string, data: {
  title?: string;
  description?: string | null;
  status?: "pending" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high" | "urgent";
  assigned_to?: string | null;
  due_date?: string | null;
  module?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const updateData: Record<string, unknown> = { ...data };
  if (data.status) {
    updateData.completed_at = data.status === "completed" ? new Date().toISOString() : null;
  }

  const { error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", id);

  if (error) throw error;

  await supabase.from("audit_log").insert({
    user_id: user.id,
    entity: "task",
    entity_id: id,
    action: "update",
    changes: updateData,
  });

  return { success: true };
}

export async function deleteTask(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id);

  if (error) throw error;

  await supabase.from("audit_log").insert({
    user_id: user.id,
    entity: "task",
    entity_id: id,
    action: "delete",
  });

  return { success: true };
}
