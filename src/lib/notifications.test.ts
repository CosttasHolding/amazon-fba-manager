import { describe, expect, it } from "vitest";
import { generateNotifications } from "./notifications";

type QueryCall = { method: string; args: unknown[] };

function makeQuery(result: unknown, calls: QueryCall[], onInsert?: (payload: unknown) => void) {
  const query: Record<string, unknown> = {
    select: (...args: unknown[]) => {
      calls.push({ method: "select", args });
      return query;
    },
    eq: (...args: unknown[]) => {
      calls.push({ method: "eq", args });
      return query;
    },
    in: (...args: unknown[]) => {
      calls.push({ method: "in", args });
      return query;
    },
    gte: (...args: unknown[]) => {
      calls.push({ method: "gte", args });
      return query;
    },
    insert: (payload: unknown) => {
      onInsert?.(payload);
      return query;
    },
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

describe("generateNotifications tenant scoping", () => {
  it("aplica org_id a productos, proveedores y notificaciones, incluido el insert", async () => {
    const callsByTable: Record<string, QueryCall[]> = {};
    const inserted: unknown[] = [];
    const product = {
      id: "product-1",
      name: "Producto",
      sku: "SKU-1",
      stock_status: "out_of_stock",
      status: "active",
      stock_available: 0,
      reorder_point: 10,
      max_stock: 100,
      days_of_stock: null,
      sale_price: 20,
      net_profit: 5,
    };
    const supabase = {
      from: (table: string) => {
        const calls = (callsByTable[table] ||= []);
        return makeQuery(
          table === "products_with_inventory"
            ? { data: [product], error: null }
            : table === "product_suppliers"
              ? { data: [], error: null }
              : { data: [], error: null },
          calls,
          table === "notifications" ? (payload) => inserted.push(payload) : undefined
        );
      },
    };

    await generateNotifications("user-1", "org-1", supabase as never);

    for (const table of ["products_with_inventory", "product_suppliers", "notifications"]) {
      expect(callsByTable[table]).toContainEqual({ method: "eq", args: ["org_id", "org-1"] });
    }
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toEqual([
      expect.objectContaining({ org_id: "org-1", user_id: "user-1" }),
    ]);
  });
});
