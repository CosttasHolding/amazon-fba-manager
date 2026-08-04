import type { CompetitionLevel } from "@/types";

export const STATUS_ORDER = ["idea", "validating", "approved", "in_progress", "launched", "rejected"] as const;

export const STATUS_CONFIG: Record<string, { color: string; border: string; bg: string }> = {
  idea: { color: "text-slate-400", border: "border-slate-500/20", bg: "bg-slate-500/5" },
  validating: { color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/5" },
  approved: { color: "text-cyan-400", border: "border-cyan-500/20", bg: "bg-cyan-500/5" },
  in_progress: { color: "text-purple-400", border: "border-purple-500/20", bg: "bg-purple-500/5" },
  launched: { color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
  rejected: { color: "text-rose-400", border: "border-rose-500/20", bg: "bg-rose-500/5" },
};

export const PRIORITY_COLORS: Record<number, string> = {
  1: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  2: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  3: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  4: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  5: "text-slate-500 bg-slate-500/5 border-slate-500/10",
};

export function scoreBadgeClass(score: number): string {
  if (score >= 70) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  if (score >= 40) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
  return "text-rose-500 bg-rose-500/10 border-rose-500/20";
}

export type CompetitionFilter = "all" | CompetitionLevel;

export function matchCompetitionFilter(level: CompetitionLevel | null, filter: CompetitionFilter): boolean {
  return filter === "all" || level === filter;
}