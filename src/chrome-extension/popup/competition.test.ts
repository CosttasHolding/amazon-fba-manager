import { describe, it, expect } from "vitest";
import { competitionLevelFromCaptured } from "./competition";

describe("competitionLevelFromCaptured", () => {
  it("null si no hay datos de competencia", () => {
    expect(competitionLevelFromCaptured({})).toBeNull();
    expect(competitionLevelFromCaptured({ seller_count_fba: null })).toBeNull();
  });

  it("pocos sellers FBA -> competencia muy baja", () => {
    expect(competitionLevelFromCaptured({ seller_count_fba: 1, review_count: 10, average_rating: 4.8 })).toBe("very_low");
  });

  it("muchos sellers FBA -> competencia muy alta", () => {
    expect(competitionLevelFromCaptured({ seller_count_fba: 50, review_count: 3000, average_rating: 3.5 })).toBe("very_high");
  });

  it("caso medio -> media", () => {
    expect(competitionLevelFromCaptured({ seller_count_fba: 6, review_count: 300, average_rating: 4.0 })).toBe("medium");
  });
});