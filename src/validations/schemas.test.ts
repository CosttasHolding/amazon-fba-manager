import { describe, it, expect } from "vitest";
import { productSchema } from "@/validations/product";
import { supplierSchema } from "@/validations/supplier";
import { stockMovementSchema } from "@/validations/inventory";
import { saleSchema } from "@/validations/sales";
import { orderSchema } from "@/validations/order";
import { researchSchema } from "@/validations/research";

describe("productSchema", () => {
  it("valida un producto correcto", () => {
    const result = productSchema.safeParse({
      sku: "SKU-001",
      name: "Test Product",
      unitCost: 10,
      salePrice: 30,
      status: "active",
      marketplace: "US",
    });
    expect(result.success).toBe(true);
  });

  it("falla sin SKU", () => {
    const result = productSchema.safeParse({
      name: "Test",
      unitCost: 10,
      salePrice: 30,
    });
    expect(result.success).toBe(false);
  });

  it("falla con costo negativo", () => {
    const result = productSchema.safeParse({
      sku: "SKU-001",
      name: "Test",
      unitCost: -5,
      salePrice: 30,
    });
    expect(result.success).toBe(false);
  });

  it("acepta marketplace valido", () => {
    const result = productSchema.safeParse({
      sku: "SKU-001",
      name: "Test",
      unitCost: 10,
      salePrice: 30,
      marketplace: "UK",
    });
    expect(result.success).toBe(true);
  });

  it("falla con marketplace invalido", () => {
    const result = productSchema.safeParse({
      sku: "SKU-001",
      name: "Test",
      unitCost: 10,
      salePrice: 30,
      marketplace: "BR",
    });
    expect(result.success).toBe(false);
  });
});

describe("supplierSchema", () => {
  it("valida un proveedor correcto", () => {
    const result = supplierSchema.safeParse({
      name: "Supplier Co",
      status: "active",
    });
    expect(result.success).toBe(true);
  });

  it("falla sin nombre", () => {
    const result = supplierSchema.safeParse({ status: "active" });
    expect(result.success).toBe(false);
  });

  it("valida rating entre 1 y 5", () => {
    const valid = supplierSchema.safeParse({ name: "Test", rating: 3 });
    expect(valid.success).toBe(true);

    const tooHigh = supplierSchema.safeParse({ name: "Test", rating: 6 });
    expect(tooHigh.success).toBe(false);

    const tooLow = supplierSchema.safeParse({ name: "Test", rating: 0 });
    expect(tooLow.success).toBe(false);
  });
});

describe("stockMovementSchema", () => {
  it("valida movimiento correcto", () => {
    const result = stockMovementSchema.safeParse({
      productId: "550e8400-e29b-41d4-a716-446655440000",
      movementType: "sale",
      quantity: 5,
    });
    expect(result.success).toBe(true);
  });

  it("falla con tipo invalido", () => {
    const result = stockMovementSchema.safeParse({
      productId: "550e8400-e29b-41d4-a716-446655440000",
      movementType: "invalid_type",
      quantity: 5,
    });
    expect(result.success).toBe(false);
  });
});

describe("saleSchema", () => {
  it("valida venta correcta", () => {
    const result = saleSchema.safeParse({
      productId: "550e8400-e29b-41d4-a716-446655440000",
      saleDate: new Date("2024-01-15"),
      unitsSold: 10,
      revenue: 300,
    });
    expect(result.success).toBe(true);
  });

  it("falla sin producto", () => {
    const result = saleSchema.safeParse({
      saleDate: new Date("2024-01-15"),
      unitsSold: 10,
      revenue: 300,
    });
    expect(result.success).toBe(false);
  });
});

describe("orderSchema", () => {
  it("valida orden correcta", () => {
    const result = orderSchema.safeParse({
      quantity: 100,
      unit_cost: 5.5,
      status: "draft",
    });
    expect(result.success).toBe(true);
    expect(result.data?.currency).toBe("USD");
    expect(result.data?.exchange_rate).toBe(1);
  });

  it("falla sin cantidad", () => {
    const result = orderSchema.safeParse({ unit_cost: 10 });
    expect(result.success).toBe(false);
  });

  it("falla con cantidad negativa", () => {
    const result = orderSchema.safeParse({ quantity: -5, unit_cost: 10 });
    expect(result.success).toBe(false);
  });

  it("falla con costo cero", () => {
    const result = orderSchema.safeParse({ quantity: 10, unit_cost: 0 });
    expect(result.success).toBe(false);
  });

  it("acepta shipping_method valido", () => {
    const result = orderSchema.safeParse({
      quantity: 10,
      unit_cost: 5,
      shipping_method: "sea",
    });
    expect(result.success).toBe(true);
  });

  it("falla con shipping_method invalido", () => {
    const result = orderSchema.safeParse({
      quantity: 10,
      unit_cost: 5,
      shipping_method: "truck",
    });
    expect(result.success).toBe(false);
  });

  it("acepta status valido", () => {
    const result = orderSchema.safeParse({
      quantity: 10,
      unit_cost: 5,
      status: "in_production",
    });
    expect(result.success).toBe(true);
  });

  it("aplica defaults correctamente", () => {
    const result = orderSchema.safeParse({ quantity: 10, unit_cost: 5 });
    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("draft");
    expect(result.data?.currency).toBe("USD");
    expect(result.data?.exchange_rate).toBe(1);
  });
});

describe("researchSchema", () => {
  it("valida research correcto", () => {
    const result = researchSchema.safeParse({
      name: "Nuevo Producto",
      status: "idea",
      priority: 3,
    });
    expect(result.success).toBe(true);
  });

  it("falla sin nombre", () => {
    const result = researchSchema.safeParse({ status: "idea" });
    expect(result.success).toBe(false);
  });

  it("falla con nombre vacio", () => {
    const result = researchSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("valida rating entre 0 y 5", () => {
    const valid = researchSchema.safeParse({ name: "Test", average_rating: 4.5 });
    expect(valid.success).toBe(true);

    const tooHigh = researchSchema.safeParse({ name: "Test", average_rating: 5.1 });
    expect(tooHigh.success).toBe(false);

    const negative = researchSchema.safeParse({ name: "Test", average_rating: -0.1 });
    expect(negative.success).toBe(false);
  });

  it("valida priority entre 1 y 5", () => {
    const valid = researchSchema.safeParse({ name: "Test", priority: 5 });
    expect(valid.success).toBe(true);

    const tooHigh = researchSchema.safeParse({ name: "Test", priority: 6 });
    expect(tooHigh.success).toBe(false);

    const tooLow = researchSchema.safeParse({ name: "Test", priority: 0 });
    expect(tooLow.success).toBe(false);
  });

  it("acepta competition_level valido", () => {
    const result = researchSchema.safeParse({ name: "Test", competition_level: "high" });
    expect(result.success).toBe(true);
  });

  it("falla con competition_level invalido", () => {
    const result = researchSchema.safeParse({ name: "Test", competition_level: "extreme" });
    expect(result.success).toBe(false);
  });

  it("aplica defaults correctamente", () => {
    const result = researchSchema.safeParse({ name: "Test" });
    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("idea");
    expect(result.data?.priority).toBe(3);
  });

  it("valida keywords como array", () => {
    const result = researchSchema.safeParse({
      name: "Test",
      keywords: ["keyword1", "keyword2"],
    });
    expect(result.success).toBe(true);
  });
});
