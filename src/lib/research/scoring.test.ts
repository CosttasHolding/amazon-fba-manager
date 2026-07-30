import { describe, it, expect } from "vitest";
import { calculateScore } from "./scoring";
import type { ScoringInput } from "./types";

describe("calculateScore", () => {
  it("devuelve score 0 si no hay datos", () => {
    const input: ScoringInput = {};
    const result = calculateScore(input);
    expect(result.total).toBe(0);
    expect(result.dimensions.demanda.score).toBe(0);
    expect(result.dimensions.competencia.score).toBe(0);
    expect(result.dimensions.rentabilidad.score).toBe(0);
    expect(result.dimensions.oportunidad.score).toBe(0);
  });

  it("producto con alta demanda y baja competencia da score alto", () => {
    const input: ScoringInput = {
      estimated_monthly_sales: 5000,
      estimated_monthly_revenue: 150000,
      bsr: 500,
      review_count: 50,
      average_rating: 4.5,
      seller_count_fba: 1,
      price: 29.99,
      estimated_fba_fee: 8.5,
      estimated_cogs: 8,
    };
    const result = calculateScore(input);
    expect(result.total).toBeGreaterThan(70);
    expect(result.dimensions.demanda.score).toBeGreaterThan(80);
    expect(result.dimensions.competencia.score).toBeGreaterThan(70);
  });

  it("producto con baja demanda y alta competencia da score bajo", () => {
    const input: ScoringInput = {
      estimated_monthly_sales: 100,
      estimated_monthly_revenue: 1500,
      bsr: 50000,
      review_count: 5000,
      average_rating: 3.0,
      seller_count_fba: 20,
      price: 9.99,
      estimated_fba_fee: 5,
      estimated_cogs: 5,
    };
    const result = calculateScore(input);
    expect(result.total).toBeLessThan(40);
  });

  it("demanda alta da score > 80 en demanda", () => {
    const result = calculateScore({ estimated_monthly_sales: 10000 });
    expect(result.dimensions.demanda.score).toBeGreaterThan(80);
  });

  it("muchos sellers FBA dan score bajo en competencia", () => {
    const result = calculateScore({ seller_count_fba: 30 });
    expect(result.dimensions.competencia.score).toBeLessThan(30);
  });

  it("margen alto da score alto en rentabilidad", () => {
    const result = calculateScore({ price: 50, estimated_fba_fee: 5, estimated_cogs: 10 });
    expect(result.dimensions.rentabilidad.score).toBeGreaterThan(80);
  });
});
