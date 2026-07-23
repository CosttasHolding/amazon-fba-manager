export interface AmazonProductData {
  platform: "amazon";
  name: string | null;
  asin: string | null;
  price: number | null;
  weight_kg: number | null;
  category: string | null;
  image_url: string | null;
  description: string | null;
  dimensions: {
    length: number | null;
    width: number | null;
    height: number | null;
    unit: string;
  } | null;
}

export interface AlibabaSupplierData {
  platform: "alibaba";
  supplier_name: string | null;
  country: string | null;
  moq: number | null;
  unit_price: number | null;
  image_url: string | null;
  description: string | null;
  product_name: string | null;
}

export type ScrapeData = AmazonProductData | AlibabaSupplierData;

export interface ScrapeSuccess {
  ok: true;
  platform: "amazon" | "alibaba";
  data: ScrapeData;
}

export interface ScrapeError {
  ok: false;
  error: string;
}

export type ScrapeResult = ScrapeSuccess | ScrapeError;

export type Platform = "amazon" | "alibaba" | "unknown";
