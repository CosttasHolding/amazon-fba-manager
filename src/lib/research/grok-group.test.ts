import { describe, it, expect, vi, beforeEach } from "vitest";
import { classifyWithGrok } from "./grok-group";
import type { CapturedProduct } from "@/lib/research/types";

vi.mock("@/lib/ai/client", () => ({ getXAIClient: () => null as never }));

const prod = (): CapturedProduct => ({
  asin: "B016NE9A2A",
  title: "Foam Roller MarcaX",
  price: 19.99,
  currency: "USD",
  bsr: null,
  review_count: null,
  average_rating: null,
  estimated_monthly_sales: null,
  estimated_monthly_revenue: null,
  estimated_fba_fee: null,
  seller_count_fba: null,
  seller_count_fbm: null,
  category: "Foam Rollers",
  brand: null,
  image_url: null,
  source: "scraper",
  capture_url: "https://amazon.com/dp/B016NE9A2A",
  capture_timestamp: new Date().toISOString(),
});

describe("grok-group", () => {
  beforeEach(() => vi.resetModules());
  it("lanza si no hay cliente (fallback del caller)", async () => {
    await expect(classifyWithGrok(prod())).rejects.toThrow();
  });
});
