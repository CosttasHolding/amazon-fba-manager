import { describe, it, expect } from "vitest";
import type { AnalyzeProductResponse, ListingData } from "./types";

describe("AnalyzeProductResponse", () => {
  it("tiene todos los campos requeridos", () => {
    const response: AnalyzeProductResponse = {
      name: "Test Product",
      niche: "Electronics",
      amazon_category: "Electronics",
      estimated_monthly_sales: 500,
      average_price: 25.99,
      review_count_competitor: 120,
      average_rating: 4.2,
      bsr: 15000,
      competition_level: "medium",
      estimated_cogs: 10.5,
      estimated_selling_price: 29.99,
      estimated_roi: 35,
      differentiation_notes: "Better packaging",
      keywords: ["wireless", "bluetooth"],
      notes: "Good opportunity",
    };
    expect(response.name).toBe("Test Product");
    expect(response.competition_level).toBe("medium");
    expect(response.keywords).toEqual(["wireless", "bluetooth"]);
  });

  it("acepta competition_level low", () => {
    const response: AnalyzeProductResponse = {
      name: "Test",
      niche: null,
      amazon_category: null,
      estimated_monthly_sales: null,
      average_price: null,
      review_count_competitor: null,
      average_rating: null,
      bsr: null,
      competition_level: "low",
      estimated_cogs: null,
      estimated_selling_price: null,
      estimated_roi: null,
      differentiation_notes: null,
      keywords: [],
      notes: null,
    };
    expect(response.competition_level).toBe("low");
  });

  it("acepta competition_level high", () => {
    const response: AnalyzeProductResponse = {
      name: "Test",
      niche: null,
      amazon_category: null,
      estimated_monthly_sales: null,
      average_price: null,
      review_count_competitor: null,
      average_rating: null,
      bsr: null,
      competition_level: "high",
      estimated_cogs: null,
      estimated_selling_price: null,
      estimated_roi: null,
      differentiation_notes: null,
      keywords: [],
      notes: null,
    };
    expect(response.competition_level).toBe("high");
  });
});

describe("ListingData", () => {
  it("tiene todos los campos requeridos", () => {
    const listing: ListingData = {
      asin: "B0TEST123",
      title: "Test Product",
      price: 29.99,
      currency: "USD",
      category: "Electronics",
      brand: "TestBrand",
      bulletPoints: ["Feature 1", "Feature 2"],
      images: ["https://example.com/img1.jpg"],
    };
    expect(listing.asin).toBe("B0TEST123");
    expect(listing.bulletPoints).toHaveLength(2);
    expect(listing.images).toHaveLength(1);
  });

  it("acepta price null", () => {
    const listing: ListingData = {
      asin: "B0TEST456",
      title: "Another Product",
      price: null,
      currency: "USD",
      category: "Home",
      brand: "Brand",
      bulletPoints: [],
      images: [],
    };
    expect(listing.price).toBeNull();
  });

  it("acepta description opcional", () => {
    const withDesc: ListingData = {
      asin: "B0TEST789",
      title: "With Description",
      price: 10,
      currency: "USD",
      category: "Books",
      brand: "Brand",
      bulletPoints: [],
      images: [],
      description: "A long description",
    };
    expect(withDesc.description).toBe("A long description");

    const withoutDesc: ListingData = {
      asin: "B0TEST000",
      title: "No Description",
      price: 10,
      currency: "USD",
      category: "Books",
      brand: "Brand",
      bulletPoints: [],
      images: [],
    };
    expect(withoutDesc.description).toBeUndefined();
  });
});
