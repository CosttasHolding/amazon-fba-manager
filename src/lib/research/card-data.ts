export type SourceData = Record<string, unknown> | null | undefined;

export function numField(sd: SourceData, key: string): number | null {
  const raw = sd?.[key];
  if (typeof raw === "number") return raw;
  if (typeof raw === "string" && raw.trim() !== "" && !Number.isNaN(Number(raw))) return Number(raw);
  return null;
}

export function fmtCompact(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export type ScoreRank = "high" | "mid" | "low";

export function scoreRank(score: number): ScoreRank {
  if (score >= 70) return "high";
  if (score >= 40) return "mid";
  return "low";
}

const COMPETITION_COLORS: Record<string, string> = {
  very_low: "text-emerald-500 bg-emerald-500/10",
  low: "text-green-500 bg-green-500/10",
  medium: "text-amber-500 bg-amber-500/10",
  high: "text-orange-500 bg-orange-500/10",
  very_high: "text-rose-500 bg-rose-500/10",
};

export function competitionBadgeClass(level: string): string {
  return COMPETITION_COLORS[level] ?? "text-amber-500 bg-amber-500/10";
}
