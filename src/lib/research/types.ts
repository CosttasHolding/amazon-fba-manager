export interface CapturedProduct {
  asin: string;
  title: string;
  price: number | null;
  currency: string;
  bsr: number | null;
  review_count: number | null;
  average_rating: number | null;
  estimated_monthly_sales: number | null;
  estimated_monthly_revenue: number | null;
  estimated_fba_fee: number | null;
  seller_count_fba: number | null;
  seller_count_fbm: number | null;
  category: string | null;
  brand: string | null;
  image_url: string | null;
  source: "h10_xray" | "scraper" | "manual";
  capture_url: string;
  capture_timestamp: string;
}

export interface CapturePayload {
  products: CapturedProduct[];
  mode: "h10" | "scraper";
  page_type: "search" | "product" | "unknown";
  search_keyword?: string;
}

export interface ScoringInput {
  estimated_monthly_sales?: number | null;
  estimated_monthly_revenue?: number | null;
  bsr?: number | null;
  review_count?: number | null;
  average_rating?: number | null;
  seller_count_fba?: number | null;
  price?: number | null;
  estimated_fba_fee?: number | null;
  estimated_cogs?: number | null;
}

export interface DimensionScore {
  score: number;
  label: string;
  weight: number;
  details?: string;
}

export interface ScoringResult {
  total: number;
  dimensions: {
    demanda: DimensionScore;
    competencia: DimensionScore;
    rentabilidad: DimensionScore;
    oportunidad: DimensionScore;
  };
}

export interface DeepDiveResult {
  asin: string;
  analysis: {
    summary: string;
    pain_points: string[];
    differentiation_opportunities: string[];
    market_fit: "high" | "medium" | "low";
    market_fit_reason: string;
    risk_factors: string[];
    recommended_actions: string[];
    estimated_difficulty: "easy" | "moderate" | "hard";
  };
}
