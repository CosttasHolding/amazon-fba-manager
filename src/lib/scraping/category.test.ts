import { describe, it, expect } from "vitest";
import { mapAmazonCategory } from "./category";

describe("mapAmazonCategory", () => {
  it("mapea categorias exactas de Amazon a categorias internas", () => {
    expect(mapAmazonCategory("Electronics")).toBe("Electronics");
    expect(mapAmazonCategory("Toys & Games")).toBe("Toys");
    expect(mapAmazonCategory("Home & Kitchen")).toBe("Home");
    expect(mapAmazonCategory("Beauty & Personal Care")).toBe("Beauty");
    expect(mapAmazonCategory("Sports & Outdoors")).toBe("Sports");
    expect(mapAmazonCategory("Books")).toBe("Books");
    expect(mapAmazonCategory("Health & Household")).toBe("Health");
  });

  it("mapea con matching por subcadena y sin importar mayusculas", () => {
    expect(mapAmazonCategory("Cell Phones & Accessories")).toBe("Electronics");
    expect(mapAmazonCategory("Office Products")).toBe("Electronics");
    expect(mapAmazonCategory("home")).toBe("Home");
    expect(mapAmazonCategory("KITCHEN")).toBe("Kitchen");
    expect(mapAmazonCategory("Patio, Lawn & Garden")).toBe("Home");
  });

  it("devuelve null para categorias no reconocidas", () => {
    expect(mapAmazonCategory("Digital Music")).toBeNull();
    expect(mapAmazonCategory(null)).toBeNull();
    expect(mapAmazonCategory("")).toBeNull();
  });
});
