import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Member, Task, BoardDecision } from "@/types";

const SWR_CONFIG = {
  revalidateOnFocus: false,
  dedupingInterval: 10000,
  errorRetryCount: 3,
};

interface ApiResponse<T> {
  data: T[];
}

export function useMembers() {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<Member>>("/api/members", fetcher, SWR_CONFIG);
  return { members: data?.data || [], isLoading, isError: !!error, mutate };
}

export function useTasks(status?: string, taskModule?: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (taskModule) params.set("module", taskModule);
  const qs = params.toString();
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<Task>>(`/api/tasks${qs ? `?${qs}` : ""}`, fetcher, SWR_CONFIG);
  return { tasks: data?.data || [], isLoading, isError: !!error, mutate };
}

export function useBoardDecisions() {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<BoardDecision>>("/api/board-decisions", fetcher, SWR_CONFIG);
  return { decisions: data?.data || [], isLoading, isError: !!error, mutate };
}

export function useGovernanceSummary() {
  const { data: membersData } = useSWR<ApiResponse<Member>>("/api/members", fetcher, SWR_CONFIG);
  const { data: tasksData } = useSWR<ApiResponse<Task>>("/api/tasks", fetcher, SWR_CONFIG);
  const { data: decisionsData } = useSWR<ApiResponse<BoardDecision>>("/api/board-decisions", fetcher, SWR_CONFIG);

  const members = membersData?.data || [];
  const tasks = tasksData?.data || [];
  const decisions = decisionsData?.data || [];

  return {
    totalMembers: members.length,
    activeMembers: members.filter((m) => m.status === "active").length,
    totalOwnership: members.reduce((sum, m) => sum + (m.ownership_pct || 0), 0),
    pendingTasks: tasks.filter((t) => t.status !== "completed").length,
    completedTasks: tasks.filter((t) => t.status === "completed").length,
    overdueTasks: tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed").length,
    totalDecisions: decisions.length,
    approvedDecisions: decisions.filter((d) => d.status === "approved" || d.status === "executed").length,
  };
}
