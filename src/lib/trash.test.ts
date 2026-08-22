import { describe, it, expect } from "vitest";
import {
  TRASH_ENTITIES,
  TRASH_NAME_COLUMN,
  normalizeTable,
  isGroupEntity,
} from "./trash";

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

  it("mapea una columna de nombre no vacía para cada entidad", () => {
    expect(Object.keys(TRASH_NAME_COLUMN)).toHaveLength(TRASH_ENTITIES.length);
    for (const entity of TRASH_ENTITIES) {
      const column = TRASH_NAME_COLUMN[entity];
      expect(typeof column).toBe("string");
      expect(column.length).toBeGreaterThan(0);
    }
  });

  it("usa columnas humanas donde existen y id como último recurso", () => {
    expect(TRASH_NAME_COLUMN.research_groups).toBe("name");
    expect(TRASH_NAME_COLUMN.products).toBe("name");
    expect(TRASH_NAME_COLUMN.tasks).toBe("title");
    expect(TRASH_NAME_COLUMN.members).toBe("full_name");
    expect(TRASH_NAME_COLUMN.purchase_orders).toBe("po_number");
    expect(TRASH_NAME_COLUMN.ppc_campaigns).toBe("campaign_name");
    expect(TRASH_NAME_COLUMN.fba_shipments).toBe("shipment_name");
    expect(TRASH_NAME_COLUMN.expenses).toBe("description");
    expect(TRASH_NAME_COLUMN.inventory).toBe("id");
    expect(TRASH_NAME_COLUMN.reorder_rules).toBe("id");
  });
});