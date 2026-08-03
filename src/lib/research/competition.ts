type CompetitionLevel5 = "very_low" | "low" | "medium" | "high" | "very_high";

export function competitionLevelFromScore(score: number): CompetitionLevel5 {
  if (score >= 80) return "very_low";
  if (score >= 60) return "low";
  if (score >= 40) return "medium";
  if (score >= 20) return "high";
  return "very_high";
}