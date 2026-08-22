import type { CompetitionLevel, ProductResearch } from "@/types";

export type ResearchGroupItem = ProductResearch & { group_id: string | null };

export interface ResearchGroupWithItems {
  id: string;
  name: string;
  niche: string | null;
  amazon_category: string | null;
  search_keyword: string | null;
  created_at: string;
  updated_at: string;
  products: ResearchGroupItem[];
}

export type GroupSortKey = "best_score" | "competition" | "name" | "recent";

export type GroupStatusFilter = "all" | ProductResearch["status"];
export type GroupCompetitionFilter = "all" | CompetitionLevel;
export type GroupScoreRangeFilter = "all" | "high" | "mid" | "low";

export interface GroupFilters {
  q: string;
  status: GroupStatusFilter;
  competition: GroupCompetitionFilter;
  scoreRange: GroupScoreRangeFilter;
}

const COMPETITION_RANK: Record<CompetitionLevel, number> = {
  very_low: 0,
  low: 1,
  medium: 2,
  high: 3,
  very_high: 4,
};

function scoreInRange(score: number | null, range: GroupScoreRangeFilter): boolean {
  if (range === "all") return true;
  if (score == null) return false;
  if (range === "high") return score >= 70;
  if (range === "mid") return score >= 40 && score < 70;
  return score < 40;
}

function itemMatchesQ(item: ResearchGroupItem, q: string): boolean {
  return (
    item.name.toLowerCase().includes(q) ||
    (item.niche?.toLowerCase().includes(q) ?? false) ||
    (item.asin_reference?.toLowerCase().includes(q) ?? false)
  );
}

function itemPasses(item: ResearchGroupItem, filters: GroupFilters): boolean {
  const q = filters.q.trim().toLowerCase();
  if (q && !itemMatchesQ(item, q)) return false;
  if (filters.status !== "all" && item.status !== filters.status) return false;
  if (filters.competition !== "all" && item.competition_level !== filters.competition) return false;
  if (!scoreInRange(item.score ?? null, filters.scoreRange)) return false;
  return true;
}

function groupPasses(group: ResearchGroupWithItems, filters: GroupFilters): boolean {
  const q = filters.q.trim().toLowerCase();
  if (q) {
    const inGroup =
      group.name.toLowerCase().includes(q) ||
      (group.niche?.toLowerCase().includes(q) ?? false);
    if (!inGroup && !group.products.some((i) => itemMatchesQ(i, q))) return false;
  }
  if (filters.status !== "all" && !group.products.some((i) => i.status === filters.status)) {
    return false;
  }
  if (filters.competition !== "all" && itemCompetition(group) !== filters.competition) {
    return false;
  }
  if (!scoreInRange(bestScore(group), filters.scoreRange)) return false;
  return true;
}

export function bestScore(group: ResearchGroupWithItems): number | null {
  let max: number | null = null;
  for (const item of group.products) {
    if (item.score != null && (max === null || item.score > max)) max = item.score;
  }
  return max;
}

export function itemCompetition(group: ResearchGroupWithItems): CompetitionLevel | null {
  let best: CompetitionLevel | null = null;
  for (const item of group.products) {
    const level = item.competition_level;
    if (!level) continue;
    if (best === null || COMPETITION_RANK[level] < COMPETITION_RANK[best]) best = level;
  }
  return best;
}

export function sortGroups(
  groups: ResearchGroupWithItems[],
  sortKey: GroupSortKey
): ResearchGroupWithItems[] {
  return [...groups].sort((a, b) => {
    if (sortKey === "name") return a.name.localeCompare(b.name);
    if (sortKey === "recent") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortKey === "competition") {
      const ca = itemCompetition(a);
      const cb = itemCompetition(b);
      if (ca === null && cb !== null) return 1;
      if (cb === null && ca !== null) return -1;
      if (ca !== null && cb !== null && ca !== cb) return COMPETITION_RANK[ca] - COMPETITION_RANK[cb];
      return a.name.localeCompare(b.name);
    }
    const sa = bestScore(a);
    const sb = bestScore(b);
    if (sa === null && sb !== null) return 1;
    if (sb === null && sa !== null) return -1;
    if (sa !== null && sb !== null && sa !== sb) return sb - sa;
    return a.name.localeCompare(b.name);
  });
}

export function filterGroups(
  groups: ResearchGroupWithItems[],
  filters: GroupFilters
): ResearchGroupWithItems[] {
  return groups.filter((g) => groupPasses(g, filters));
}

export function filterLooseItems(
  items: ResearchGroupItem[],
  filters: GroupFilters
): ResearchGroupItem[] {
  return items.filter((i) => itemPasses(i, filters));
}
