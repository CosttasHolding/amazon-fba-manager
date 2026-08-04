import { describe, it, expect } from "vitest";
import { numField, fmtCompact, scoreRank, competitionBadgeClass } from "@/lib/research/card-data";

describe("numField", () => {
  it("lee números", () => {
    expect(numField({ bsr: 52 }, "bsr")).toBe(52);
  });

  it("lee strings numéricos", () => {
    expect(numField({ net_margin_percent: "80" }, "net_margin_percent")).toBe(80);
  });

  it("devuelve null si el campo falta o es inválido", () => {
    expect(numField({}, "bsr")).toBeNull();
    expect(numField(null, "bsr")).toBeNull();
    expect(numField({ bsr: "N/A" }, "bsr")).toBeNull();
  });
});

describe("fmtCompact", () => {
  it("formatea números grandes con sufijo", () => {
    expect(fmtCompact(1200, "en-US")).toBe("1.2K");
    expect(fmtCompact(91900, "en-US")).toBe("91.9K");
  });

  it("no inventa sufijo para números chicos", () => {
    expect(fmtCompact(50, "en-US")).toBe("50");
  });
});

describe("scoreRank", () => {
  it("high para score >= 70", () => {
    expect(scoreRank(70)).toBe("high");
    expect(scoreRank(100)).toBe("high");
  });

  it("mid para 40-69", () => {
    expect(scoreRank(69)).toBe("mid");
    expect(scoreRank(40)).toBe("mid");
  });

  it("low para < 40", () => {
    expect(scoreRank(39)).toBe("low");
    expect(scoreRank(0)).toBe("low");
  });

  it("low si no hay score", () => {
    expect(scoreRank(-1)).toBe("low");
  });
});

describe("competitionBadgeClass", () => {
  const levels = ["very_low", "low", "medium", "high", "very_high"];
  it("devuelve una clase para cada nivel", () => {
    for (const level of levels) {
      expect(competitionBadgeClass(level)).toContain("text-");
      expect(competitionBadgeClass(level)).toContain("bg-");
    }
  });

  it("cada nivel tiene un color distinto", () => {
    const colors = levels.map((l) => competitionBadgeClass(l));
    expect(new Set(colors).size).toBe(5);
  });

  it("niveles extremos son opuestos", () => {
    expect(competitionBadgeClass("very_low")).toContain("emerald");
    expect(competitionBadgeClass("very_high")).toContain("rose");
  });
});
