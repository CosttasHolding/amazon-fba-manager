import { describe, it, expect } from "vitest";
import { competitionLevelFromScore } from "./competition";

describe("competitionLevelFromScore", () => {
  it("80-100 -> very_low (poca competencia)", () => {
    expect(competitionLevelFromScore(100)).toBe("very_low");
    expect(competitionLevelFromScore(80)).toBe("very_low");
  });

  it("60-79 -> low", () => {
    expect(competitionLevelFromScore(79)).toBe("low");
    expect(competitionLevelFromScore(60)).toBe("low");
  });

  it("40-59 -> medium", () => {
    expect(competitionLevelFromScore(59)).toBe("medium");
    expect(competitionLevelFromScore(40)).toBe("medium");
  });

  it("20-39 -> high", () => {
    expect(competitionLevelFromScore(39)).toBe("high");
    expect(competitionLevelFromScore(20)).toBe("high");
  });

  it("0-19 -> very_high (mucha competencia)", () => {
    expect(competitionLevelFromScore(19)).toBe("very_high");
    expect(competitionLevelFromScore(0)).toBe("very_high");
  });
});