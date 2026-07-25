import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Member, Task, BoardDecision } from "@/types";
import { SWR_CONFIG } from "@/hooks/use-data";

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

export interface GovernanceSummary {
  totalMembers: number;
  activeMembers: number;
  totalOwnership: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalDecisions: number;
  approvedDecisions: number;
}

const EMPTY_SUMMARY: GovernanceSummary = {
  totalMembers: 0,
  activeMembers: 0,
  totalOwnership: 0,
  pendingTasks: 0,
  completedTasks: 0,
  overdueTasks: 0,
  totalDecisions: 0,
  approvedDecisions: 0,
};

export function useGovernanceSummary() {
  const { data, error, isLoading, mutate } = useSWR<GovernanceSummary>("/api/governance/summary", fetcher, SWR_CONFIG);
  return { ...(data || EMPTY_SUMMARY), isLoading, isError: !!error, mutate };
}
