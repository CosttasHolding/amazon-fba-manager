export interface CompetitionSource {
  seller_count_fba?: number | null;
  review_count?: number | null;
  average_rating?: number | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function competitionLevelFromCaptured(p: CompetitionSource): string | null {
  const sellers = p.seller_count_fba ?? 0;
  const reviews = p.review_count ?? 0;
  const rating = p.average_rating ?? 0;

  if (sellers <= 0 && reviews <= 0 && rating <= 0) return null;

  let s = 100;
  if (sellers > 0) s -= clamp(sellers * 3.5, 0, 75);
  if (reviews > 0) s -= clamp(Math.log2(reviews + 1) * 3, 0, 20);
  if (rating > 0) s -= clamp((5 - rating) * 5, 0, 20);
  const score = Math.round(clamp(s, 0, 100));

  if (score >= 80) return "very_low";
  if (score >= 60) return "low";
  if (score >= 40) return "medium";
  if (score >= 20) return "high";
  return "very_high";
}