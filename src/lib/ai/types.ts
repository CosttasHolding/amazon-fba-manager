export interface ListingData {
  asin: string;
  title: string;
  price: number | null;
  currency: string;
  category: string;
  brand: string;
  bulletPoints: string[];
  images: string[];
  description?: string;
}

export interface AnalyzeProductResponse {
  name: string;
  niche: string | null;
  amazon_category: string | null;
  estimated_monthly_sales: number | null;
  average_price: number | null;
  review_count_competitor: number | null;
  average_rating: number | null;
  bsr: number | null;
  competition_level: "low" | "medium" | "high";
  estimated_cogs: number | null;
  estimated_selling_price: number | null;
  estimated_roi: number | null;
  differentiation_notes: string | null;
  keywords: string[];
  notes: string | null;
}
