import { describe, it, expect } from "vitest";
import { toScoringInputFromRow, rowHasData, recomputeScoreForRow } from "./recompute";
import type { ResearchRowLike } from "./recompute";

describe("toScoringInputFromRow", () => {
  it("mapea columnas correctamente, incluidos review_count_competitor->review_count y average_price->price", () => {
    const input = toScoringInputFromRow({
      estimated_monthly_sales: 100,
      bsr: 5000,
      review_count_competitor: 25,
      average_rating: 4.5,
      average_price: 19.99,
      estimated_cogs: 5,
    });

    expect(input).toEqual({
      estimated_monthly_sales: 100,
      estimated_monthly_revenue: null,
      bsr: 5000,
      review_count: 25,
      average_rating: 4.5,
      seller_count_fba: null,
      price: 19.99,
      estimated_fba_fee: null,
      estimated_cogs: 5,
    });
  });

  it("usa fallbacks desde source_data cuando la columna es null", () => {
    const input = toScoringInputFromRow({
      estimated_monthly_revenue: null,
      seller_count_fba: null,
      estimated_fba_fee: null,
      source_data: {
        estimated_monthly_revenue: 1234,
        seller_count_fba: 3,
        estimated_fba_fee: 2.5,
      },
    });

    expect(input.estimated_monthly_revenue).toBe(1234);
    expect(input.seller_count_fba).toBe(3);
    expect(input.estimated_fba_fee).toBe(2.5);
  });

  it("si la columna tiene valor, gana la columna sobre source_data", () => {
    const input = toScoringInputFromRow({
      estimated_monthly_revenue: 500,
      seller_count_fba: 7,
      estimated_fba_fee: 1.5,
      source_data: {
        estimated_monthly_revenue: 9999,
        seller_count_fba: 99,
        estimated_fba_fee: 9.9,
      },
    });

    expect(input.estimated_monthly_revenue).toBe(500);
    expect(input.seller_count_fba).toBe(7);
    expect(input.estimated_fba_fee).toBe(1.5);
  });

  it("valores null/undefined pasan como null (sin source_data)", () => {
    const input = toScoringInputFromRow({});

    expect(input).toEqual({
      estimated_monthly_sales: null,
      estimated_monthly_revenue: null,
      bsr: null,
      review_count: null,
      average_rating: null,
      seller_count_fba: null,
      price: null,
      estimated_fba_fee: null,
      estimated_cogs: null,
    });
  });
});

describe("rowHasData", () => {
  it("false cuando todos los campos relevantes son null/undefined", () => {
    expect(rowHasData({})).toBe(false);
    const allNull: ResearchRowLike = {
      estimated_monthly_sales: null,
      estimated_monthly_revenue: null,
      bsr: null,
      review_count_competitor: null,
      average_rating: null,
      seller_count_fba: null,
      average_price: null,
      estimated_fba_fee: null,
      estimated_cogs: null,
    };
    expect(rowHasData(allNull)).toBe(false);
  });

  it("true si hay solo un campo con valor", () => {
    expect(rowHasData({ bsr: 100 })).toBe(true);
    expect(rowHasData({ average_price: 9.99 })).toBe(true);
    expect(rowHasData({ review_count_competitor: 5 })).toBe(true);
  });

  it("true cuando el valor viene solo desde source_data", () => {
    expect(rowHasData({ source_data: { estimated_monthly_revenue: 1 } })).toBe(true);
    expect(rowHasData({ source_data: { seller_count_fba: 2 } })).toBe(true);
  });

  it("estimated_cogs por sí solo no cuenta como datos", () => {
    expect(rowHasData({ estimated_cogs: 5 })).toBe(false);
  });
});

describe("recomputeScoreForRow", () => {
  it("devuelve todos null cuando rowHasData es false", () => {
    const result = recomputeScoreForRow({});

    expect(result).toEqual({
      score: null,
      competition_level: null,
      score_details: null,
    });
  });

  it("calcula score>0 y competition_level coherente con datos completos", () => {
    const row: ResearchRowLike = {
      estimated_monthly_sales: 1000,
      estimated_monthly_revenue: 6000,
      bsr: 500,
      review_count_competitor: 50,
      average_rating: 4.5,
      seller_count_fba: 5,
      average_price: 24.99,
      estimated_fba_fee: 6,
      estimated_cogs: 7,
    };

    const result = recomputeScoreForRow(row);

    expect(result.score).not.toBeNull();
    expect(result.score).toBeGreaterThan(0);
    expect(result.competition_level).not.toBeNull();
    expect(result.score_details).not.toBeNull();
    expect(result.score_details).toHaveProperty("demanda");
    expect(result.score_details).toHaveProperty("competencia");
    expect(result.score_details).toHaveProperty("rentabilidad");
    expect(result.score_details).toHaveProperty("oportunidad");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("fila con estimated_monthly_sales alta produce score positivo", () => {
    const result = recomputeScoreForRow({ estimated_monthly_sales: 5000 });

    expect(result.score).not.toBeNull();
    expect(result.score!).toBeGreaterThan(0);
  });

  it("competencia muy alta (many sellers FBA) tiende a very_high", () => {
    const result = recomputeScoreForRow({
      seller_count_fba: 5000,
      review_count_competitor: 5000,
      average_rating: 1,
    });

    expect(result.competition_level).toBe("very_high");
  });

  it("competencia baja (sellers 0, reviews 0, rating 5) es very_low", () => {
    const result = recomputeScoreForRow({
      seller_count_fba: 0,
      review_count_competitor: 0,
      average_rating: 5,
    });

    expect(result.competition_level).toBe("very_low");
  });
});