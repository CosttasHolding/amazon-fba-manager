import { describe, it, expect } from "vitest";
import { normalizeItemName, findGroupByAsin, findGroupByNicheAndName, fallbackClassify } from "./grouping";
import type { CapturedProduct } from "@/lib/research/types";

const groups = [
  { id: "g1", name: "Foam Roller MarcaX 36in", niche: "Foam Rollers", amazon_category: "Home & Kitchen", products: [{ asin_reference: "B016NE9A2A" }] },
  { id: "g2", name: "Yoga Mat MarcaY", niche: "Exercise Mats", amazon_category: "Sports & Outdoors", products: [{ asin_reference: "B0ABCDEF01" }] },
];

const prod = (overrides: Partial<CapturedProduct> = {}): CapturedProduct => ({
  asin: "B016NE9A2A",
  title: "Foam Roller MarcaX 36 inch",
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
  ...overrides,
});

describe("grouping", () => {
  it("normaliza nombre (minus, acentos, stopwords)", () => {
    expect(normalizeItemName("Foam Roller MarcaX 36 inch")).toBe("foam roller marcax 36 inch");
    expect(normalizeItemName("The Yoga Mat!")).toContain("yoga mat");
  });
  it("encuentra grupo por ASIN exacto", () => {
    expect(findGroupByAsin(groups, "b016ne9a2a")).toBe("g1");
    expect(findGroupByAsin(groups, null)).toBeNull();
    expect(findGroupByAsin(groups, "ZZZZ")).toBeNull();
  });
  it("encuentra grupo por nicho + nombre superpuesto", () => {
    const g = groups.map((x) => ({ ...x }));
    expect(findGroupByNicheAndName(g, "Foam Roller MarcaX 36 inch", "Foam Rollers")).toBe("g1");
    expect(findGroupByNicheAndName(g, "Metal Water Bottle", "Home & Kitchen")).toBeNull();
  });
  it("fallbackClassify: mismo ASIN → existing", () => {
    const r = fallbackClassify(prod(), groups);
    expect(r.match).toBe("existing");
    expect(r.group_id).toBe("g1");
  });
  it("fallbackClassify: mismo nicho+nombre → existing", () => {
    const r = fallbackClassify(prod({ asin: "SPECIALNEW11", capture_url: "https://amazon.com/dp/SPECIALNEW11" }), groups);
    expect(r.match).toBe("existing");
    expect(r.group_id).toBe("g1");
  });
  it("fallbackClassify: sin match → new", () => {
    const r = fallbackClassify(prod({ asin: "BRANDNEW111", title: "Ceramic Mug Set", capture_url: "https://amazon.com/dp/BRANDNEW111" }), groups);
    expect(r.match).toBe("new");
    expect(r.group_id).toBeNull();
    expect(r.group_name).toContain("Ceramic Mug Set");
  });
});
