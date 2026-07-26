import { describe, it, expect } from "vitest";
import { buildAnalyzeProductPrompt } from "./prompts";
import type { ListingData } from "./types";

describe("buildAnalyzeProductPrompt", () => {
  const listing: ListingData = {
    asin: "B0TEST123",
    title: "Wireless Bluetooth Headphones",
    price: 29.99,
    currency: "USD",
    category: "Electronics",
    brand: "SoundPlus",
    bulletPoints: ["Noise cancelling", "30h battery", "Comfort fit"],
    images: ["https://example.com/img.jpg"],
  };

  it("devuelve un string no vacio", () => {
    const prompt = buildAnalyzeProductPrompt(listing);
    expect(prompt).toBeTruthy();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("contiene el titulo del producto", () => {
    const prompt = buildAnalyzeProductPrompt(listing);
    expect(prompt).toContain("Wireless Bluetooth Headphones");
  });

  it("contiene el precio y moneda", () => {
    const prompt = buildAnalyzeProductPrompt(listing);
    expect(prompt).toContain("29.99");
    expect(prompt).toContain("USD");
  });

  it("contiene la categoria", () => {
    const prompt = buildAnalyzeProductPrompt(listing);
    expect(prompt).toContain("Electronics");
  });

  it("contiene la marca", () => {
    const prompt = buildAnalyzeProductPrompt(listing);
    expect(prompt).toContain("SoundPlus");
  });

  it("contiene los bullet points", () => {
    const prompt = buildAnalyzeProductPrompt(listing);
    expect(prompt).toContain("Noise cancelling");
    expect(prompt).toContain("30h battery");
    expect(prompt).toContain("Comfort fit");
  });

  it("contiene el ASIN", () => {
    const prompt = buildAnalyzeProductPrompt(listing);
    expect(prompt).toContain("B0TEST123");
  });

  it("maneja price null", () => {
    const nullPriceListing: ListingData = { ...listing, price: null };
    const prompt = buildAnalyzeProductPrompt(nullPriceListing);
    expect(prompt).toContain("N/A");
  });
});
