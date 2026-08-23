import { describe, it, expect } from "vitest";
import { productSchema } from "@/validations/product";
import { supplierSchema } from "@/validations/supplier";
import { stockMovementSchema } from "@/validations/inventory";
import { saleSchema } from "@/validations/sales";
import { orderSchema } from "@/validations/order";
import { researchSchema } from "@/validations/research";
import { commentSchema, commentQuerySchema } from "@/validations/comment";
import { auditLogSchema, auditLogQuerySchema } from "@/validations/audit-log";
import { settingsUpdateSchema } from "@/validations/settings";

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

  it("acepta sin SKU (opcional)", () => {
    const result = productSchema.safeParse({
      name: "Test",
      unitCost: 10,
      salePrice: 30,
    });
    expect(result.success).toBe(true);
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

  it("normaliza dutyRate ausente o null a cero", () => {
    expect(productSchema.safeParse({ name: "Test" }).data?.dutyRate).toBe(0);
    expect(productSchema.safeParse({ name: "Test", dutyRate: null }).data?.dutyRate).toBe(0);
  });

  it("acepta dutyRate como fraccion entre cero y uno", () => {
    expect(productSchema.safeParse({ name: "Test", dutyRate: 0.25 }).success).toBe(true);
    expect(productSchema.safeParse({ name: "Test", dutyRate: 0 }).success).toBe(true);
    expect(productSchema.safeParse({ name: "Test", dutyRate: 1 }).success).toBe(true);
  });

  it("rechaza dutyRate negativo o mayor que uno", () => {
    expect(productSchema.safeParse({ name: "Test", dutyRate: -0.01 }).success).toBe(false);
    expect(productSchema.safeParse({ name: "Test", dutyRate: 1.01 }).success).toBe(false);
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
      product_id: "550e8400-e29b-41d4-a716-446655440000",
      sale_date: "2024-01-15",
      units_sold: 10,
      revenue: 300,
    });
    expect(result.success).toBe(true);
  });

  it("falla sin producto", () => {
    const result = saleSchema.safeParse({
      sale_date: "2024-01-15",
      units_sold: 10,
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

  it("acepta sin nombre (opcional)", () => {
    const result = researchSchema.safeParse({ status: "idea" });
    expect(result.success).toBe(true);
  });

  it("acepta con nombre vacio", () => {
    const result = researchSchema.safeParse({ name: "" });
    expect(result.success).toBe(true);
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
    const result = researchSchema.safeParse({ name: "Test", competition_level: "very_high" });
    expect(result.success).toBe(true);
  });

  it("acepta los 5 niveles", () => {
    for (const level of ["very_low", "low", "medium", "high", "very_high"]) {
      const result = researchSchema.safeParse({ name: "Test", competition_level: level });
      expect(result.success).toBe(true);
    }
  });

  it("falla con competition_level invalido", () => {
    const result = researchSchema.safeParse({ name: "Test", competition_level: "extreme" });
    expect(result.success).toBe(false);
  });

  it("acepta URLs validas de amazon y alibaba", () => {
    const result = researchSchema.safeParse({
      name: "Test",
      amazon_url: "https://www.amazon.com/dp/B0TEST1234",
      alibaba_url: "https://www.alibaba.com/product-detail/foo.html",
    });
    expect(result.success).toBe(true);
  });

  it("acepta URL vacia o null", () => {
    expect(researchSchema.safeParse({ name: "Test", amazon_url: "", alibaba_url: null }).success).toBe(true);
    expect(researchSchema.safeParse({ name: "Test" }).success).toBe(true);
  });

  it("rechaza URL invalida", () => {
    const result = researchSchema.safeParse({ name: "Test", amazon_url: "no-es-una-url" });
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

  it("valida las metricas de revenue editables", () => {
    const result = researchSchema.safeParse({
      name: "Test",
      estimated_monthly_revenue: 5000,
      estimated_fba_fee: 3.5,
      seller_count_fba: 12,
    });
    expect(result.success).toBe(true);
    expect(result.data?.estimated_monthly_revenue).toBe(5000);
    expect(result.data?.estimated_fba_fee).toBe(3.5);
    expect(result.data?.seller_count_fba).toBe(12);
  });

  it("acepta las metricas de revenue como null", () => {
    const result = researchSchema.safeParse({
      name: "Test",
      estimated_monthly_revenue: null,
      estimated_fba_fee: null,
      seller_count_fba: null,
    });
    expect(result.success).toBe(true);
    expect(result.data?.estimated_monthly_revenue).toBeNull();
    expect(result.data?.estimated_fba_fee).toBeNull();
    expect(result.data?.seller_count_fba).toBeNull();
  });

  it("rechaza valores negativos en las metricas de revenue", () => {
    const result = researchSchema.safeParse({
      name: "Test",
      estimated_monthly_revenue: -100,
      estimated_fba_fee: -0.5,
      seller_count_fba: -1,
    });
    expect(result.success).toBe(false);
  });
});

const UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("commentSchema", () => {
  it("valida un comentario correcto", () => {
    const result = commentSchema.safeParse({
      entity: "product",
      entity_id: UUID,
      content: "Buen producto",
    });
    expect(result.success).toBe(true);
  });

  it("falla sin content", () => {
    const result = commentSchema.safeParse({
      entity: "product",
      entity_id: UUID,
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("falla con entity invalida", () => {
    const result = commentSchema.safeParse({
      entity: "invalid",
      entity_id: UUID,
      content: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("falla con entity_id no UUID", () => {
    const result = commentSchema.safeParse({
      entity: "product",
      entity_id: "not-a-uuid",
      content: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("acepta parent_id opcional", () => {
    const result = commentSchema.safeParse({
      entity: "order",
      entity_id: UUID,
      content: "Reply",
      parent_id: UUID,
    });
    expect(result.success).toBe(true);
  });
});

describe("commentQuerySchema", () => {
  it("valida query correcta", () => {
    const result = commentQuerySchema.safeParse({
      entity: "product",
      entity_id: UUID,
    });
    expect(result.success).toBe(true);
  });

  it("falla sin entity", () => {
    const result = commentQuerySchema.safeParse({ entity_id: UUID });
    expect(result.success).toBe(false);
  });
});

describe("auditLogSchema", () => {
  it("valida un audit log correcto", () => {
    const result = auditLogSchema.safeParse({
      entity: "product",
      entity_id: UUID,
      action: "create",
    });
    expect(result.success).toBe(true);
    expect(result.data?.changes).toEqual({});
  });

  it("acepta changes como objeto", () => {
    const result = auditLogSchema.safeParse({
      entity: "order",
      entity_id: UUID,
      action: "update",
      changes: { status: ["draft", "confirmed"] },
    });
    expect(result.success).toBe(true);
  });

  it("falla con action invalida", () => {
    const result = auditLogSchema.safeParse({
      entity: "product",
      entity_id: UUID,
      action: "modify",
    });
    expect(result.success).toBe(false);
  });

  it("falla con entity invalida", () => {
    const result = auditLogSchema.safeParse({
      entity: "invalid",
      entity_id: UUID,
      action: "create",
    });
    expect(result.success).toBe(false);
  });

  it("aplica default changes vacio", () => {
    const result = auditLogSchema.safeParse({
      entity: "product",
      entity_id: UUID,
      action: "delete",
    });
    expect(result.success).toBe(true);
    expect(result.data?.changes).toEqual({});
  });
});

describe("auditLogQuerySchema", () => {
  it("valida query vacia", () => {
    const result = auditLogQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("valida con filtros", () => {
    const result = auditLogQuerySchema.safeParse({
      entity: "product",
      action: "create",
    });
    expect(result.success).toBe(true);
  });

  it("falla con entity invalida", () => {
    const result = auditLogQuerySchema.safeParse({ entity: "bad" });
    expect(result.success).toBe(false);
  });
});

describe("settingsUpdateSchema", () => {
  it("valida update con campos permitidos", () => {
    const result = settingsUpdateSchema.safeParse({
      full_name: "Juan",
      target_roi: 30,
    });
    expect(result.success).toBe(true);
  });

  it("valida language es/en/ar", () => {
    expect(settingsUpdateSchema.safeParse({ language: "es" }).success).toBe(true);
    expect(settingsUpdateSchema.safeParse({ language: "en" }).success).toBe(true);
    expect(settingsUpdateSchema.safeParse({ language: "ar" }).success).toBe(true);
    expect(settingsUpdateSchema.safeParse({ language: "fr" }).success).toBe(false);
  });

  it("falla con objeto vacio", () => {
    const result = settingsUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("valida default_referral_fee max 100", () => {
    expect(settingsUpdateSchema.safeParse({ default_referral_fee: 50 }).success).toBe(true);
    expect(settingsUpdateSchema.safeParse({ default_referral_fee: 101 }).success).toBe(false);
  });

  it("valida tax_rate max 100", () => {
    expect(settingsUpdateSchema.safeParse({ tax_rate: 21 }).success).toBe(true);
    expect(settingsUpdateSchema.safeParse({ tax_rate: 101 }).success).toBe(false);
  });

  it("falla con costo negativo", () => {
    const result = settingsUpdateSchema.safeParse({ default_fba_fee: -1 });
    expect(result.success).toBe(false);
  });
});
