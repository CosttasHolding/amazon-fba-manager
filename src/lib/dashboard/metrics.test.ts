import { describe, expect, it } from "vitest";
import { calcMetrics } from "@/lib/dashboard/metrics";

describe("dashboard metrics", () => {
  it("calcula el valor de inventario con total_cost, incluyendo duty", () => {
    const result = calcMetrics(
      [{
        id: "product-1",
        status: "active",
        net_profit: 6.78,
        sale_price: 30,
        roi: 43.74,
        stock_available: 4,
        stock_status: "normal",
        unit_cost: 10,
        total_cost: 15.5,
        revenue_last_30d: 0,
        sales_velocity_30d: 0,
      }],
      [],
      [],
    );

    expect(result.total_inventory_value).toBe(62);
  });

  it("mantiene el fallback a unit_cost si total_cost no está disponible", () => {
    const result = calcMetrics(
      [{
        id: "product-1",
        status: "active",
        net_profit: 10,
        sale_price: 30,
        roi: 50,
        stock_available: 4,
        stock_status: "normal",
        unit_cost: 10,
        total_cost: null,
        revenue_last_30d: 0,
        sales_velocity_30d: 0,
      }],
      [],
      [],
    );

    expect(result.total_inventory_value).toBe(40);
  });
});
