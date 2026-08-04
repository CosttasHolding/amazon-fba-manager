import type { ScoringInput, ScoringResult } from "./types";
import { calculateScore } from "./scoring";
import { competitionLevelFromScore } from "./competition";
import type { CompetitionLevel } from "@/types";

export interface ResearchRowLike {
  estimated_monthly_sales?: number | null;
  estimated_monthly_revenue?: number | null;
  bsr?: number | null;
  review_count_competitor?: number | null;
  average_rating?: number | null;
  seller_count_fba?: number | null;
  average_price?: number | null;
  estimated_fba_fee?: number | null;
  estimated_cogs?: number | null;
  source_data?: Record<string, unknown> | null;
}

export interface RecomputeResult {
  score: number | null;
  competition_level: CompetitionLevel | null;
  score_details: ScoringResult["dimensions"] | null;
}

export function toScoringInputFromRow(row: ResearchRowLike): ScoringInput {
  const source = row.source_data ?? {};
  return {
    estimated_monthly_sales: row.estimated_monthly_sales ?? null,
    estimated_monthly_revenue:
      row.estimated_monthly_revenue ?? (source.estimated_monthly_revenue as number | undefined) ?? null,
    bsr: row.bsr ?? null,
    review_count: row.review_count_competitor ?? null,
    average_rating: row.average_rating ?? null,
    seller_count_fba: row.seller_count_fba ?? (source.seller_count_fba as number | undefined) ?? null,
    price: row.average_price ?? null,
    estimated_fba_fee: row.estimated_fba_fee ?? (source.estimated_fba_fee as number | undefined) ?? null,
    estimated_cogs: row.estimated_cogs ?? null,
  };
}

export function rowHasData(row: ResearchRowLike): boolean {
  const input = toScoringInputFromRow(row);
  return (
    input.estimated_monthly_sales !== null ||
    input.estimated_monthly_revenue !== null ||
    input.bsr !== null ||
    input.review_count !== null ||
    input.average_rating !== null ||
    input.seller_count_fba !== null ||
    input.price !== null ||
    input.estimated_fba_fee !== null
  );
}

export function recomputeScoreForRow(row: ResearchRowLike): RecomputeResult {
  if (!rowHasData(row)) {
    return { score: null, competition_level: null, score_details: null };
  }

  const scored = calculateScore(toScoringInputFromRow(row));
  return {
    score: scored.total,
    competition_level: competitionLevelFromScore(scored.dimensions.competencia.score),
    score_details: scored.dimensions,
  };
}