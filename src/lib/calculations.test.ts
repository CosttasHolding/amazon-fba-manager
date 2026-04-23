import { describe, it, expect } from "vitest";
import { calcRefFee, calcFBAFee, calcMetrics } from "@/lib/calculations";

describe("calculations", () => {
  describe("calcRefFee", () => {
    it("calcula 15% del precio por defecto", () => {
      expect(calcRefFee(100)).toBe(15);
      expect(calcRefFee(0)).toBe(0);
      expect(calcRefFee(50)).toBe(7.5);
    });
  });

  describe("calcFBAFee", () => {
    it("calcula fee correcto según peso", () => {
      expect(calcFBAFee(0.3)).toBe(3.22); // < 1 lb
      expect(calcFBAFee(0.6)).toBe(4.75); // 1-2 lb
      expect(calcFBAFee(1.0)).toBe(5.40); // 2-3 lb
      expect(calcFBAFee(2.0)).toBeCloseTo(5.40 + (2.0 * 2.20462 - 3) * 0.4, 2); // > 3 lb
    });

    it("maneja peso 0", () => {
      expect(calcFBAFee(0)).toBe(3.22);
    });

    it("maneja pesos negativos", () => {
      expect(calcFBAFee(-1)).toBe(3.22); // negativo cae en < 1 lb
    });

    it("maneja pesos muy grandes", () => {
      const fee = calcFBAFee(10);
      expect(fee).toBeGreaterThan(5.40);
      expect(fee).toBeCloseTo(5.40 + (10 * 2.20462 - 3) * 0.4, 2);
    });

    it("maneja pesos decimales pequenos", () => {
      expect(calcFBAFee(0.05)).toBe(3.22);
      expect(calcFBAFee(0.1)).toBe(3.22);
    });

    it("maneja peso justo bajo 1 lb", () => {
      expect(calcFBAFee(0.45)).toBe(3.22); // ~0.99 lb
    });

    it("maneja peso justo sobre 3 lb", () => {
      expect(calcFBAFee(1.5)).toBeCloseTo(5.40 + (1.5 * 2.20462 - 3) * 0.4, 2);
    });
  });

  describe("calcMetrics", () => {
    it("calcula métricas básicas correctamente", () => {
      const result = calcMetrics(10, 2, 1, 0, 30, 4.5, 3.22, 0, 0);
      expect(result.totalCost).toBe(13); // 10 + 2 + 1 + 0
      expect(result.totalFees).toBeCloseTo(7.72, 2); // 4.5 + 3.22
      expect(result.netProfit).toBeCloseTo(9.28, 2); // 30 - 13 - 7.72
      expect(result.roi).toBeCloseTo(71.38, 1); // 9.28 / 13 * 100
      expect(result.margin).toBeCloseTo(30.93, 1); // 9.28 / 30 * 100
    });

    it("devuelve ROI 0 cuando totalCost es 0", () => {
      const result = calcMetrics(0, 0, 0, 0, 30, 4.5, 3.22, 0, 0);
      expect(result.roi).toBe(0);
    });

    it("devuelve margen 0 cuando salePrice es 0", () => {
      const result = calcMetrics(10, 0, 0, 0, 0, 0, 0, 0, 0);
      expect(result.margin).toBe(0);
    });

    it("maneja profit negativo (producto no viable)", () => {
      const result = calcMetrics(20, 5, 2, 0, 10, 1.5, 3.22, 0, 0);
      expect(result.netProfit).toBeLessThan(0);
      expect(result.roi).toBeLessThan(0);
      expect(result.margin).toBeLessThan(0);
    });
  });
});
