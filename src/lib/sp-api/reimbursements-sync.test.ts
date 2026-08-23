import { beforeEach, describe, expect, it, vi } from "vitest";
import type { createClient } from "@/lib/supabase/server";
import type { SpApiClient } from "@/lib/sp-api";
import { syncReimbursements } from "./sync-runner";

const mocks = vi.hoisted(() => ({
  createReport: vi.fn(),
  getReport: vi.fn(),
  getReportDocument: vi.fn(),
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
}));

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function queryResult(data: unknown, error: Error | null = null): Record<string, unknown> {
  const result = Promise.resolve({ data, error }) as Promise<unknown> & Record<string, unknown>;
  result.select = () => result;
  result.eq = () => result;
  result.in = () => result;
  result.or = () => result;
  result.gte = () => result;
  result.lte = () => result;
  result.is = () => result;
  result.delete = () => result;
  return result;
}

describe("syncReimbursements", () => {
  const report = [
    [
      "approval-date",
      "reimbursement-id",
      "case-id",
      "amazon-order-id",
      "reason",
      "sku",
      "fnsku",
      "asin",
      "currency-unit",
      "amount-per-unit",
      "amount-total",
      "quantity-reimbursed-cash",
      "quantity-reimbursed-inventory",
      "quantity-reimbursed-total",
    ].join("\t"),
    [
      "2024-01-31",
      "reimbursement-1",
      "case-1",
      "order-1",
      "damaged_warehouse",
      "sku-1",
      "fnsku-1",
      "asin-1",
      "USD",
      "10.00",
      "10.00",
      "1",
      "0",
      "1",
    ].join("\t"),
  ].join("\n");

  const supabase = { from: vi.fn() } as unknown as SupabaseClient;
  const upsertEvents = vi.fn();
  const replaceMatches = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createReport.mockResolvedValue({ reportId: "report-1" });
    mocks.getReport.mockResolvedValue({ processingStatus: "DONE", reportDocumentId: "document-1" });
    mocks.getReportDocument.mockResolvedValue(report);
    upsertEvents.mockImplementation((rows: Array<{ source_key: string }>) => ({
      select: vi.fn().mockResolvedValue({ data: [{ id: "event-1", source_key: rows[0].source_key }], error: null }),
    }));
    replaceMatches.mockResolvedValue({ data: null, error: null });

    supabase.from = vi.fn((table: string) => {
      if (table === "products") {
        return { select: () => queryResult([{ id: "product-1", sku: "sku-1", asin: "asin-1", marketplace: "US" }]) };
      }
      if (table === "reimbursements") {
        return { select: () => queryResult([{ amazon_case_id: "case-1" }]) };
      }
      if (table === "stock_movements") {
        return { select: () => queryResult([{
          id: "movement-1",
          product_id: "product-1",
          movement_type: "damaged",
          quantity: -1,
          created_at: "2024-02-01T12:00:00.000Z",
          reference: "loss-1",
        }]) };
      }
      if (table === "amazon_reimbursement_events") {
        return {
          select: () => queryResult([]),
          upsert: upsertEvents,
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }) as unknown as typeof supabase.from;
    (supabase as unknown as { rpc: typeof replaceMatches }).rpc = replaceMatches;
  });

  it("ingests the Amazon report, matches tenant-scoped data and stores only evidence", async () => {
    const result = await syncReimbursements(
      supabase,
      {} as SpApiClient,
      "user-1",
      "org-1",
      {
        id: "connection-1",
        org_id: "org-1",
        user_id: "user-1",
        marketplace: "US",
        refresh_token: "refresh-token",
        seller_id: "seller-1",
        access_token: "access-token",
        token_expires_at: null,
      },
    );

    expect(result).toEqual({ success: true, processed: 1, failed: 0 });
    expect(mocks.createReport).toHaveBeenCalledWith(
      expect.anything(),
      "GET_FBA_REIMBURSEMENTS_DATA",
      ["ATVPDKIKX0DER"],
    );
    expect(upsertEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        org_id: "org-1",
        connection_id: "connection-1",
        reimbursement_id: "reimbursement-1",
        product_id: "product-1",
        product_match_status: "matched_sku",
        movement_match_status: "candidate",
        reconciliation_status: "possible_duplicate_loss",
        amount_total: 10,
        quantity_reimbursed_total: 1,
      }),
    ], { onConflict: "org_id,source_key" });
    expect(replaceMatches).toHaveBeenCalledWith("replace_amazon_reimbursement_movement_matches", {
      p_org_id: "org-1",
      p_event_ids: ["event-1"],
      p_matches: [expect.objectContaining({
        event_id: "event-1",
        movement_id: "movement-1",
        confidence: "candidate",
      })],
    });
    expect(supabase.from).not.toHaveBeenCalledWith("inventory");
  });
});
