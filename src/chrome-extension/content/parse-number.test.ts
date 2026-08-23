import { describe, expect, it } from "vitest";
import { parseLocalizedNumber } from "./parse-number";

describe("parseLocalizedNumber (formatos reales Amazon)", () => {
  it.each([
    ["$1,299.99", 1299.99],
    ["$9.99", 9.99],
    ["$1,299", 1299],
    ["USD 24.50", 24.5],
    ["1,234 ratings", 1234],
    ["123,456", 123456],
    ["42", 42],
  ])("parsea '%s' como %d", (input, expected) => {
    expect(parseLocalizedNumber(input)).toBe(expected);
  });

  it.each(["", "N/A", "—", "abc"])("devuelve null para '%s'", (input) => {
    expect(parseLocalizedNumber(input)).toBeNull();
  });

  it("parsea el primer numero y aplica sufijos de magnitud", () => {
    expect(parseLocalizedNumber("4.5 out of 5 stars")).toBe(4.5);
    expect(parseLocalizedNumber("10K+ ratings")).toBe(10000);
    expect(parseLocalizedNumber("2.5M ratings")).toBe(2500000);
    expect(parseLocalizedNumber("1B+ ratings")).toBe(1000000000);
  });
});
