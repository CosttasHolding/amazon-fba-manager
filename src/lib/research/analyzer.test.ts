import { describe, it, expect, vi } from "vitest";
import { analyzeProductDeep } from "./analyzer";

const mockCreate = vi.fn();

vi.mock("@/lib/ai/client", () => ({
  getXAIClient: vi.fn(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

function mockGptResponse(payload: unknown) {
  mockCreate.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify(payload) } }],
  });
}

const validInput = {
  asin: "B0TEST1234",
  title: "Test Product",
  price: 29.99,
  bsr: 1234,
  review_count: 567,
  average_rating: 4.2,
  estimated_monthly_sales: 1200,
  category: "Sports",
  brand: "TestBrand",
};

const validAnalysis = {
  summary: "Producto con alto potencial",
  pain_points: ["Se rompe fácil"],
  differentiation_opportunities: ["Material más resistente"],
  market_fit: "high",
  market_fit_reason: "Alta demanda y poca competencia",
  risk_factors: ["Estacionalidad"],
  recommended_actions: ["Mejorar calidad"],
  estimated_difficulty: "easy",
};

describe("analyzeProductDeep", () => {
  it("devuelve el análisis intacto cuando GPT responde válido", async () => {
    mockGptResponse(validAnalysis);

    const result = await analyzeProductDeep(validInput);

    expect(result.asin).toBe("B0TEST1234");
    expect(result.analysis).toEqual(validAnalysis);
  });

  it("hace fallback de market_fit inválido a medium", async () => {
    mockGptResponse({ ...validAnalysis, market_fit: "very_high" });

    const result = await analyzeProductDeep(validInput);

    expect(result.analysis.market_fit).toBe("medium");
  });

  it("hace fallback de estimated_difficulty inválido a moderate", async () => {
    mockGptResponse({ ...validAnalysis, estimated_difficulty: "extreme" });

    const result = await analyzeProductDeep(validInput);

    expect(result.analysis.estimated_difficulty).toBe("moderate");
  });

  it("hace fallback de arrays inválidos a array vacío", async () => {
    mockGptResponse({
      ...validAnalysis,
      pain_points: "no es un array",
      risk_factors: null,
    });

    const result = await analyzeProductDeep(validInput);

    expect(result.analysis.pain_points).toEqual([]);
    expect(result.analysis.risk_factors).toEqual([]);
    expect(result.analysis.differentiation_opportunities).toEqual([
      "Material más resistente",
    ]);
  });

  it("hace fallback de strings faltantes a string vacío", async () => {
    mockGptResponse({ ...validAnalysis, summary: undefined, market_fit_reason: 42 });

    const result = await analyzeProductDeep(validInput);

    expect(result.analysis.summary).toBe("");
    expect(result.analysis.market_fit_reason).toBe("");
  });

  it("lanza error si GPT no devuelve contenido", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: null } }] });

    await expect(analyzeProductDeep(validInput)).rejects.toThrow();
  });
});
