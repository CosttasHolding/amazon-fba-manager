import { describe, expect, it } from "vitest";
import {
  buildAmazonReimbursementSourceKey,
  deriveReconciliationStatus,
  resolveReimbursementProduct,
  selectReimbursementMovementMatches,
} from "./reconciliation";

const baseRow = {
  reimbursementId: "reimbursement-1",
  caseId: "case-1",
  amazonOrderId: "order-1",
  originalReimbursementId: null,
  originalReimbursementType: null,
  sku: "sku-1",
  fnsku: "fnsku-1",
  asin: "asin-1",
  reason: "damaged_warehouse",
  approvalDate: "2024-01-31",
  amountPerUnit: 10,
  amountTotal: 10,
  currency: "USD",
  quantityReimbursedCash: 1,
  quantityReimbursedInventory: 0,
  quantityReimbursedTotal: 1,
  rawRow: {},
};

describe("Amazon reimbursement reconciliation", () => {
  it("uses an external id for a stable tenant-scoped source key", () => {
    const first = buildAmazonReimbursementSourceKey("connection-1", "US", baseRow);
    const second = buildAmazonReimbursementSourceKey("connection-1", "US", {
      ...baseRow,
      rawRow: { reordered: "columns" },
    });

    expect(first).toBe("amazon-reimbursement:connection-1:US:reimbursement-1");
    expect(second).toBe(first);
  });

  it("keeps fallback keys distinct when Amazon includes different stable fields", () => {
    const first = buildAmazonReimbursementSourceKey("connection-1", "US", {
      ...baseRow,
      reimbursementId: null,
      rawRow: { "case-id": "case-1", reason: "damaged_warehouse", "amount-total": "10" },
    });
    const second = buildAmazonReimbursementSourceKey("connection-1", "US", {
      ...baseRow,
      reimbursementId: null,
      rawRow: { "case-id": "case-1", reason: "damaged_warehouse", "amount-total": "11" },
    });

    expect(first).not.toBe(second);
  });

  it("matches SKU first and rejects SKU/ASIN conflicts", () => {
    const candidates = [
      { id: "product-1", sku: "sku-1", asin: "asin-1", marketplace: "US" },
      { id: "product-2", sku: "sku-2", asin: "asin-2", marketplace: "US" },
    ];

    expect(resolveReimbursementProduct(baseRow, candidates, "US")).toEqual({
      productId: "product-1",
      status: "matched_sku",
    });
    expect(resolveReimbursementProduct({ ...baseRow, asin: "asin-1", sku: "sku-2" }, candidates, "US"))
      .toEqual({ productId: null, status: "conflict" });
  });

  it("does not choose an ASIN arbitrarily when it is ambiguous", () => {
    const candidates = [
      { id: "product-1", sku: null, asin: "asin-1", marketplace: "US" },
      { id: "product-2", sku: null, asin: "asin-1", marketplace: "US" },
    ];

    expect(resolveReimbursementProduct({ sku: null, asin: "asin-1" }, candidates, "US"))
      .toEqual({ productId: null, status: "ambiguous" });
  });

  it("finds a damaged movement only inside the approved-date window", () => {
    const movement = {
      id: "movement-1",
      product_id: "product-1",
      movement_type: "damaged",
      quantity: -1,
      created_at: "2024-02-10T12:00:00.000Z",
      reference: "loss-1",
    };

    expect(selectReimbursementMovementMatches(baseRow, [movement])).toEqual({
      status: "candidate",
      candidates: [movement],
    });
    expect(selectReimbursementMovementMatches({ ...baseRow, approvalDate: "2024-04-01" }, [movement]))
      .toEqual({ status: "none", candidates: [] });
  });

  it("keeps lost reimbursements non-comparable and labels existing claims separately", () => {
    expect(selectReimbursementMovementMatches({
      ...baseRow,
      reason: "lost_warehouse",
    }, [])).toEqual({ status: "not_comparable", candidates: [] });
    expect(deriveReconciliationStatus("none", true)).toBe("possible_existing_claim");
    expect(deriveReconciliationStatus("candidate", false)).toBe("possible_duplicate_loss");
  });
});
