import type { CompetitionLevel } from "@/types";

export function competitionLevelFromScore(score: number): CompetitionLevel {
  if (score >= 80) return "very_low";
  if (score >= 60) return "low";
  if (score >= 40) return "medium";
  if (score >= 20) return "high";
  return "very_high";
}