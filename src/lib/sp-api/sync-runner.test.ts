import { beforeEach, describe, expect, it, vi } from "vitest";
import type { createClient } from "@/lib/supabase/server";
import type { SpApiClient } from "@/lib/sp-api";
import {
  getSettlementField,
  hashSettlementLine,
  isSettlementReimbursementLine,
  normalizeSettlementFeeType,
  parseSettlementAmount,
  runSync,
  syncProducts,
  syncPayouts,
} from "./sync-runner";

const mocks = vi.hoisted(() => ({
  createReport: vi.fn(),
  getReport: vi.fn(),
  getReportDocument: vi.fn(),
  getListings: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/sp-api", () => ({
  SpApiClient: class {},
  SpApiAuthError: class extends Error {},
  refreshAccessToken: vi.fn(),
  getOrders: vi.fn(),
  getOrderItems: vi.fn(),
  getInventory: vi.fn(),
  getFeeEstimate: vi.fn(),
  createReport: mocks.createReport,
  getReport: mocks.getReport,
  getReportDocument: mocks.getReportDocument,
  getListings: mocks.getListings,
}));

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

describe("syncPayouts settlement lines", () => {
  const headers = ["settlement-id", "transaction-type", "amount-description", "amount", "currency", "posted-date", "order-id", "sku", "asin", "marketplace-name"];
  const document = [
    headers.join("\t"),
    ["settlement-1", "Order", "Principal", "15.00", "EUR", "2024-01-02", "order-1", "sku-1", "asin-1", "Amazon.es"].join("\t"),
    ["settlement-1", "Refund", "FBA fees", "-2.50", "EUR", "2024-01-02", "order-2", "sku-2", "asin-2", "Amazon.es"].join("\t"),
    ["settlement-1", "Refund", "FBA fees", "-2.50", "EUR", "2024-01-02", "order-2", "sku-2", "asin-2", "Amazon.es"].join("\t"),
  ].join("\n");
  const reorderedColumnsHeaders = ["amount", "asin", "currency", "settlement-id", "transaction-type", "posted-date", "order-id", "sku", "amount-description", "marketplace-name"];
  const reorderedColumnsDocument = [
    reorderedColumnsHeaders.join("\t"),
    ["15.00", "asin-1", "EUR", "settlement-1", "Order", "2024-01-02", "order-1", "sku-1", "Principal", "Amazon.es"].join("\t"),
    ["-2.50", "asin-2", "EUR", "settlement-1", "Refund", "2024-01-02", "order-2", "sku-2", "FBA fees", "Amazon.es"].join("\t"),
    ["-2.50", "asin-2", "EUR", "settlement-1", "Refund", "2024-01-02", "order-2", "sku-2", "FBA fees", "Amazon.es"].join("\t"),
  ].join("\n");

  const lineUpsert = vi.fn();
  const expenseUpsert = vi.fn();
  const from = vi.fn();
  let existingSettlementLines: Array<{ settlement_id: string; line_hash: string }> = [];
  let existingExpenseKeys = new Set<string>();
  let products: Array<{ id: string; sku: string | null; asin: string | null }> = [];
  const supabase = { from } as unknown as SupabaseClient;

  function queryChain(data: unknown): Record<string, unknown> {
    const result = Promise.resolve({ data, error: null }) as Promise<unknown> & Record<string, unknown>;
    result.select = () => result;
    result.eq = () => result;
  result.in = () => result;
  result.or = () => result;
  result.order = () => result;
  return result;
}

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createReport.mockResolvedValue({ reportId: "report-1" });
    mocks.getReport.mockResolvedValue({ processingStatus: "DONE", reportDocumentId: "document-1" });
    mocks.getReportDocument.mockResolvedValue(document);
    existingSettlementLines = [];
    existingExpenseKeys = new Set();
    products = [{ id: "product-2", sku: "sku-2", asin: "asin-2" }];
    lineUpsert.mockImplementation(async (lines: Array<{ settlement_id: string; line_hash: string }>) => {
      existingSettlementLines = Array.from(
        new Map(
          [...existingSettlementLines, ...lines].map((line) => [`${line.settlement_id}:${line.line_hash}`, line]),
        ).values(),
      );
      return { error: null };
    });
    expenseUpsert.mockImplementation((rows: Array<{ source_key: string }>) => {
      const insertedRows = rows.filter((row) => !existingExpenseKeys.has(row.source_key));
      for (const row of insertedRows) existingExpenseKeys.add(row.source_key);
      return {
        select: vi.fn(async () => ({
          data: insertedRows.map((_, index) => ({ id: `expense-${index}` })),
          error: null,
        })),
      };
    });
    from.mockImplementation((table: string) => {
      if (table === "amazon_settlement_lines") {
        return { upsert: lineUpsert };
      }
      if (table === "products") return { select: () => queryChain(products) };
      return { upsert: expenseUpsert };
    });
  });

  it("normaliza aliases, conserva importes negativos y usa ocurrencias estables", () => {
    const row = ["settlement-1", "Fee", "Storage", "-2.50"];
    const rowHeaders = ["settlement-id", "transaction-type", "amount_description", "amount"];

    expect(getSettlementField(row, rowHeaders, ["amount-description", "amount_description"])).toBe("Storage");
    expect(normalizeSettlementFeeType(row, rowHeaders)).toBe("Storage");
    expect(normalizeSettlementFeeType(
      ["settlement-1", "Fee", "Storage"],
      ["settlement-id", "transaction-type", "fee-type"],
    )).toBe("Storage");
    expect(normalizeSettlementFeeType(
      ["settlement-1", "Fee", "Storage"],
      ["settlement-id", "transaction-type", "description"],
    )).toBe("Storage");
    expect(parseSettlementAmount("-2.50")).toBe(-2.5);
    expect(parseSettlementAmount("+2.50")).toBe(2.5);
    expect(parseSettlementAmount("12.34USD")).toBeNull();
    expect(parseSettlementAmount("1,234.56")).toBeNull();
    const otherRow = ["settlement-1", "Fee", "Storage", "-1.50"];
    const originalHashes = [
      hashSettlementLine("settlement-1", row, 0, rowHeaders),
      hashSettlementLine("settlement-1", otherRow, 0, rowHeaders),
    ];
    const reorderedHashes = [
      hashSettlementLine("settlement-1", otherRow, 0, rowHeaders),
      hashSettlementLine("settlement-1", row, 0, rowHeaders),
    ];
    expect(new Set(reorderedHashes)).toEqual(new Set(originalHashes));
    const reorderedRow = ["-2.50", "settlement-1", "Fee", "Storage"];
    const reorderedRowHeaders = ["amount", "settlement-id", "transaction-type", "amount-description"];
    expect(hashSettlementLine("settlement-1", row, 0, rowHeaders))
      .toBe(hashSettlementLine("settlement-1", reorderedRow, 0, reorderedRowHeaders));
    expect(hashSettlementLine("settlement-1", row, 0, rowHeaders))
      .not.toBe(hashSettlementLine("settlement-1", row, 1, rowHeaders));
  });

  it("no convierte reembolsos de settlement en gastos", () => {
    expect(isSettlementReimbursementLine({
      transaction_type: "Other-Transaction",
      fee_type: "FBA Reimbursement",
      raw_row: { "amount-description": "Inventory reimbursement" },
    })).toBe(true);
    expect(isSettlementReimbursementLine({
      transaction_type: "Refund",
      fee_type: "FBA fees",
      raw_row: { "amount-description": "Referral fee" },
    })).toBe(false);
  });

  it("persiste Order y fees, asigna producto por tenant y no duplica expenses en reruns", async () => {
    const client = {} as SpApiClient;
    mocks.getReportDocument.mockResolvedValueOnce(document).mockResolvedValueOnce(reorderedColumnsDocument);

    const [firstResult, secondResult] = await Promise.all([
      syncPayouts(supabase, client, "user-1", "org-1", "ES", "connection-1"),
      syncPayouts(supabase, client, "user-1", "org-1", "ES", "connection-1"),
    ]);
    const firstLines = lineUpsert.mock.calls[0]?.[0];
    const secondLines = lineUpsert.mock.calls[1]?.[0];
    const firstExpenseRows = expenseUpsert.mock.calls[0]?.[0] as Array<{ source_key: string }>;
    const secondExpenseRows = expenseUpsert.mock.calls[1]?.[0] as Array<{ source_key: string }>;

    expect(firstResult).toEqual({ success: true, processed: 2, failed: 0 });
    expect(secondResult).toEqual({ success: true, processed: 0, failed: 0 });
    expect(firstLines).toHaveLength(3);
    expect(firstLines.map((line: { line_hash: string }) => line.line_hash).sort())
      .toEqual(secondLines.map((line: { line_hash: string }) => line.line_hash).sort());
    expect(firstExpenseRows.map((row) => row.source_key).sort())
      .toEqual(secondExpenseRows.map((row) => row.source_key).sort());
    expect(firstLines[0]).toEqual(expect.objectContaining({
      org_id: "org-1",
      user_id: "user-1",
      connection_id: "connection-1",
      report_id: "report-1",
      transaction_type: "Order",
      amount: 15,
      currency: "EUR",
      posted_at: "2024-01-02",
      marketplace: "ES",
      product_id: null,
      raw_row: expect.objectContaining({ "settlement-id": "settlement-1" }),
    }));
    expect(firstLines[1]).toEqual(expect.objectContaining({
      org_id: "org-1",
      amount: -2.5,
      fee_type: "FBA fees",
      marketplace: "ES",
      product_id: "product-2",
    }));
    expect(firstLines[1].line_hash).not.toBe(firstLines[2].line_hash);
    expect(lineUpsert).toHaveBeenNthCalledWith(1, firstLines, {
      onConflict: "org_id,settlement_id,line_hash",
      ignoreDuplicates: true,
    });
    expect(expenseUpsert).toHaveBeenCalledTimes(2);
    expect(expenseUpsert.mock.calls[0]?.[0]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        amount: 2.5,
        currency: "EUR",
        org_id: "org-1",
        source_key: expect.stringMatching(/^org-1:settlement-1:[a-f0-9]{64}$/),
      }),
    ]));
    expect(expenseUpsert).toHaveBeenNthCalledWith(1, expect.any(Array), {
      onConflict: "org_id,source_key",
      ignoreDuplicates: true,
    });
  });

  it("procesa lotes grandes sin duplicar expenses", async () => {
    const largeDocument = [
      headers.join("\t"),
      ...Array.from({ length: 1001 }, (_, index) => [
        "settlement-large",
        "Fee",
        `Storage ${index}`,
        "-1.00",
        "EUR",
        "2024-01-02",
        `order-${index}`,
        "",
        "",
        "Amazon.es",
      ].join("\t")),
    ].join("\n");
    mocks.getReportDocument.mockResolvedValue(largeDocument);

    const firstResult = await syncPayouts(supabase, {} as SpApiClient, "user-1", "org-1", "ES", "connection-1");
    const secondResult = await syncPayouts(supabase, {} as SpApiClient, "user-1", "org-1", "ES", "connection-1");

    expect(firstResult).toEqual({ success: true, processed: 1001, failed: 0 });
    expect(secondResult).toEqual({ success: true, processed: 0, failed: 0 });
    expect(expenseUpsert).toHaveBeenCalledTimes(2);
  });

  it("reintenta expenses cuando el upsert falla", async () => {
    const select = vi.fn()
      .mockResolvedValueOnce({ data: null, error: new Error("temporary expense failure") })
      .mockResolvedValueOnce({ data: [{ id: "expense-1" }], error: null });
    expenseUpsert.mockImplementationOnce(() => ({ select })).mockImplementationOnce(() => ({ select }));

    const firstResult = await syncPayouts(supabase, {} as SpApiClient, "user-1", "org-1", "ES", "connection-1");
    const secondResult = await syncPayouts(supabase, {} as SpApiClient, "user-1", "org-1", "ES", "connection-1");

    expect(firstResult).toEqual({ success: true, processed: 0, failed: 2 });
    expect(secondResult).toEqual({ success: true, processed: 1, failed: 0 });
  });

  it("rechaza una conexión cuyo usuario u organización no coincide antes de crear el cliente", async () => {
    const result = await runSync(
      supabase,
      {
        id: "connection-1",
        org_id: "org-1",
        user_id: "user-1",
        marketplace: "ES",
        refresh_token: "refresh-token",
        seller_id: "seller-1",
        access_token: "access-token",
        token_expires_at: null,
      },
      "payouts",
      "user-2",
      "org-1",
    );

    expect(result).toEqual({
      success: false,
      processed: 0,
      failed: 0,
      error: "Connection identity does not match sync context",
    });
  });
});

describe("syncProducts legacy tenant migration", () => {
  it("mueve la fila legacy única sin sobrescribir sus costes ni duplicarla", async () => {
    mocks.getListings.mockResolvedValue([{
      sku: "legacy-sku",
      asin: "asin-1",
      name: "Producto actualizado",
      price: 29.99,
      status: "ACTIVE",
    }]);

    const legacyLookup = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "legacy-product" }, error: null }),
    };
    const legacyUpdate = {
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ error: null }),
    };
    const upsert = vi.fn();
    const from = vi.fn()
      .mockReturnValueOnce(legacyLookup)
      .mockReturnValueOnce({ update: vi.fn().mockReturnValue(legacyUpdate) })
      .mockReturnValueOnce({ upsert });

    const result = await syncProducts(
      { from } as unknown as SupabaseClient,
      {} as SpApiClient,
      "user-1",
      "org-1",
      "seller-1",
      "ES",
    );

    expect(result).toEqual({ success: true, processed: 1, failed: 0 });
    expect(upsert).not.toHaveBeenCalled();
    expect(from).toHaveBeenCalledTimes(2);
    const updatePayload = from.mock.results[1]?.value.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(updatePayload).toEqual(expect.objectContaining({ org_id: "org-1", asin: "asin-1" }));
    expect(updatePayload).not.toHaveProperty("unit_cost");
    expect(updatePayload).not.toHaveProperty("shipping_cost");
  });
});
