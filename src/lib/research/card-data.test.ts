import { describe, it, expect } from "vitest";
import { numField, fmtCompact } from "@/lib/research/card-data";

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
