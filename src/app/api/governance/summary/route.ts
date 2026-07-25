export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";

interface MemberRow {
  status: string;
  ownership_pct: number | null;
}

interface TaskRow {
  status: string;
  due_date: string | null;
}

interface DecisionRow {
  status: string;
}

export const GET = createApiHandler(async ({ supabase }) => {
  const [membersRes, tasksRes, decisionsRes] = await Promise.all([
    supabase.from("members").select("status, ownership_pct"),
    supabase.from("tasks").select("status, due_date"),
    supabase.from("board_decisions").select("status"),
  ]);

  if (membersRes.error) return NextResponse.json({ error: membersRes.error.message }, { status: 500 });
  if (tasksRes.error) return NextResponse.json({ error: tasksRes.error.message }, { status: 500 });
  if (decisionsRes.error) return NextResponse.json({ error: decisionsRes.error.message }, { status: 500 });

  const members = (membersRes.data || []) as MemberRow[];
  const tasks = (tasksRes.data || []) as TaskRow[];
  const decisions = (decisionsRes.data || []) as DecisionRow[];
  const now = new Date().toISOString();

  return NextResponse.json({
    totalMembers: members.length,
    activeMembers: members.filter((m) => m.status === "active").length,
    totalOwnership: members.reduce((sum, m) => sum + (m.ownership_pct || 0), 0),
    pendingTasks: tasks.filter((task) => task.status !== "completed").length,
    completedTasks: tasks.filter((task) => task.status === "completed").length,
    overdueTasks: tasks.filter((task) => task.due_date && task.due_date < now && task.status !== "completed").length,
    totalDecisions: decisions.length,
    approvedDecisions: decisions.filter((d) => d.status === "approved" || d.status === "executed").length,
  });
});
