import { describe, it, expect } from "vitest";
import { TRASH_ENTITIES, normalizeTable, isGroupEntity } from "./trash";

describe("trash", () => {
  it("mapea entities gestionables a tablas", () => {
    expect(normalizeTable("product_research")).toBe("product_research");
    expect(normalizeTable("suppliers")).toBe("suppliers");
    expect(() => normalizeTable("sales" as never)).toThrow();
  });
  it("marca solo grupos", () => {
    expect(isGroupEntity("research_groups")).toBe(true);
    expect(isGroupEntity("products")).toBe(false);
  });
});