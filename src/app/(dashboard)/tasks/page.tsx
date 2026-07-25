export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { TasksBoard } from "@/components/tasks-board";
import { Task, Member } from "@/types";

export default async function TasksPage() {
  const supabase = await createClient();
  const [{ data: tasks }, { data: members }] = await Promise.all([
    supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("members").select("*").order("full_name"),
  ]);

  return <TasksBoard tasks={(tasks || []) as Task[]} members={(members || []) as Member[]} />;
}
