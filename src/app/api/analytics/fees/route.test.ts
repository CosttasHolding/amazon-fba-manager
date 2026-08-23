import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/analytics/fees/route";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
};

type DbCall = { table: string; op: string; args: unknown[] };
type MockResult = { data: unknown; error: unknown };
type MockChain = Promise<MockResult> & {
  select: (...args: unknown[]) => MockChain;
  eq: (...args: unknown[]) => MockChain;
  gte: (...args: unknown[]) => MockChain;
  lte: (...args: unknown[]) => MockChain;
  order: (...args: unknown[]) => MockChain;
  range: (...args: unknown[]) => Promise<MockResult>;
  maybeSingle: () => Promise<MockResult>;
};

let dbCalls: DbCall[] = [];
let settlementLines: unknown[] = [];
let membership: MockResult = { data: { role: "viewer" }, error: null };

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

function createChain(table: string): MockChain {
  const filters = new Map<string, { op: string; value: unknown }>();
  const link = (op: string) => (...args: unknown[]): MockChain => {
    dbCalls.push({ table, op, args });
    if (op !== "select") filters.set(String(args[0]), { op, value: args[1] });
    return chain;
  };
  const getRows = () => {
    if (table !== "amazon_settlement_lines") return [];
    return settlementLines.filter((line) => {
      const row = line as Record<string, unknown>;
      for (const [column, filter] of filters) {
        if (filter.op === "eq" && row[column] !== filter.value) return false;
        if (filter.op === "gte" && String(row[column] || "") < String(filter.value)) return false;
        if (filter.op === "lte" && String(row[column] || "") > String(filter.value)) return false;
      }
      return true;
    });
  };
  const chain = {
    select: link("select"),
    eq: link("eq"),
    gte: link("gte"),
    lte: link("lte"),
    order: link("order"),
    range: (from: number, to: number) => {
      dbCalls.push({ table, op: "range", args: [from, to] });
      return Promise.resolve({ data: getRows().slice(from, to + 1), error: null });
    },
    maybeSingle: () => Promise.resolve(table === "org_members" ? membership : { data: null, error: null }),
  } as MockChain;

  return chain;
}

function callsOf(table: string, op: string): DbCall[] {
  return dbCalls.filter((call) => call.table === table && call.op === op);
}

function authOk() {
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
}

function request(query = "") {
  return createMockRequest(`http://localhost/api/analytics/fees${query}`, {
    headers: { "x-org-id": "org-1", "x-forwarded-for": Math.random().toString() },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls = [];
  settlementLines = [];
  membership = { data: { role: "viewer" }, error: null };
  mockFrom.mockImplementation((table: string) => createChain(table));
});

describe("GET /api/analytics/fees", () => {
  it("requiere autenticación y membership activa", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "No auth" } });
    const unauthenticated = await GET(request());
    expect(unauthenticated.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();

    authOk();
    membership = { data: null, error: null };
    const forbidden = await GET(request());
    expect(forbidden.status).toBe(403);
    expect(callsOf("amazon_settlement_lines", "select")).toHaveLength(0);
  });

  it("aplica el org del contexto, filtros y agrupa importes firmados", async () => {
    authOk();
    settlementLines = [
      { org_id: "org-1", marketplace: "US", transaction_type: "Fee", fee_type: "Referral fee", amount: "-2.50", posted_at: "2026-08-20", product_id: "00000000-0000-0000-0000-000000000001", sku: "SKU-1", asin: "ASIN-1" },
      { org_id: "org-1", marketplace: "US", transaction_type: "Fee", fee_type: "Referral fee", amount: "1.25", posted_at: "2026-08-20", product_id: "00000000-0000-0000-0000-000000000001", sku: "SKU-1", asin: "ASIN-1" },
      { org_id: "org-1", marketplace: "US", transaction_type: "Fee", fee_type: "Storage fee", amount: "3.00", posted_at: "2026-08-21", product_id: "00000000-0000-0000-0000-000000000002", sku: "SKU-2", asin: null },
      { org_id: "org-1", marketplace: "US", transaction_type: "Order", fee_type: null, amount: "100.00", posted_at: "2026-08-21", product_id: null, sku: "SKU-3", asin: "ASIN-3" },
    ];

    const res = await GET(request("?startDate=2026-08-01&endDate=2026-08-31&marketplace=US&productId=00000000-0000-0000-0000-000000000001&feeType=Referral%20fee&orgId=org-evil"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.summary).toEqual({ totalFees: -1.25, transactionCount: 2, currency: "USD" });
    expect(body.data.byFeeType).toEqual([
      { feeType: "Referral fee", currency: "USD", amount: -1.25, count: 2 },
    ]);
    expect(body.data.byDate).toEqual([
      { date: "2026-08-20", currency: "USD", amount: -1.25 },
    ]);
    expect(body.data.byProduct).toEqual([
      { productId: "00000000-0000-0000-0000-000000000001", currency: "USD", sku: "SKU-1", asin: "ASIN-1", amount: -1.25, count: 2 },
    ]);

    expect(callsOf("amazon_settlement_lines", "eq")).toEqual(expect.arrayContaining([
      expect.objectContaining({ args: ["org_id", "org-1"] }),
      expect.objectContaining({ args: ["marketplace", "US"] }),
      expect.objectContaining({ args: ["product_id", "00000000-0000-0000-0000-000000000001"] }),
      expect.objectContaining({ args: ["fee_type", "Referral fee"] }),
    ]));
    expect(callsOf("amazon_settlement_lines", "select")).toContainEqual(expect.objectContaining({
      args: ["id, currency, transaction_type, fee_type, amount, posted_at, product_id, sku, asin"],
    }));
    expect(callsOf("amazon_settlement_lines", "order")).toContainEqual(expect.objectContaining({
      args: ["id", { ascending: true }],
    }));
    expect(callsOf("amazon_settlement_lines", "gte")).toContainEqual(expect.objectContaining({ args: ["posted_at", "2026-08-01"] }));
    expect(callsOf("amazon_settlement_lines", "lte")).toContainEqual(expect.objectContaining({ args: ["posted_at", "2026-08-31"] }));
    expect(callsOf("amazon_settlement_lines", "range")).toContainEqual(expect.objectContaining({ args: [0, 999] }));
  });

  it("excluye principal Order del total aunque tenga importe positivo", async () => {
    authOk();
    settlementLines = [
      { org_id: "org-1", transaction_type: "Order", fee_type: null, amount: "25.00", posted_at: "2026-08-20", product_id: null, sku: null, asin: null },
      { org_id: "org-1", transaction_type: "Refund", fee_type: "Refund fee", amount: "-2.00", posted_at: "2026-08-20", product_id: null, sku: null, asin: null },
    ];

    const res = await GET(request("?startDate=2026-08-01&endDate=2026-08-31"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.summary).toEqual({ totalFees: -2, transactionCount: 1, currency: "USD" });
    expect(body.data.byFeeType).toEqual([{ feeType: "Refund fee", currency: "USD", amount: -2, count: 1 }]);
  });

  it("separa monedas en los grupos y marca el resumen como mixed", async () => {
    authOk();
    settlementLines = [
      { org_id: "org-1", transaction_type: "Fee", fee_type: "Storage fee", amount: "2.00", currency: "USD", posted_at: "2026-08-20", product_id: null, sku: null, asin: null },
      { org_id: "org-1", transaction_type: "Fee", fee_type: "Storage fee", amount: "3.00", currency: "EUR", posted_at: "2026-08-20", product_id: null, sku: null, asin: null },
    ];

    const res = await GET(request("?startDate=2026-08-01&endDate=2026-08-31"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.summary).toEqual({ totalFees: null, transactionCount: 2, currency: "mixed" });
    expect(body.data.byFeeType).toEqual([
      { feeType: "Storage fee", currency: "EUR", amount: 3, count: 1 },
      { feeType: "Storage fee", currency: "USD", amount: 2, count: 1 },
    ]);
    expect(body.data.byDate).toEqual([
      { date: "2026-08-20", currency: "EUR", amount: 3 },
      { date: "2026-08-20", currency: "USD", amount: 2 },
    ]);
  });

  it("consume todas las páginas de settlement lines", async () => {
    authOk();
    settlementLines = Array.from({ length: 1001 }, (_, index) => ({
      org_id: "org-1",
      transaction_type: "Fee",
      fee_type: "Storage fee",
      amount: "1.00",
      posted_at: "2026-08-20",
      product_id: null,
      sku: null,
      asin: null,
      index,
    }));

    const res = await GET(request("?startDate=2026-08-01&endDate=2026-08-31"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.summary).toEqual({ totalFees: 1001, transactionCount: 1001, currency: "USD" });
    expect(callsOf("amazon_settlement_lines", "range")).toEqual([
      { table: "amazon_settlement_lines", op: "range", args: [0, 999] },
      { table: "amazon_settlement_lines", op: "range", args: [1000, 1999] },
    ]);
  });

  it("usa últimos 90 días por defecto y devuelve ceros sin líneas", async () => {
    authOk();
    const res = await GET(request());
    const body = await res.json();
    const today = new Date().toISOString().slice(0, 10);

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ summary: { totalFees: 0, transactionCount: 0, currency: null }, byFeeType: [], byDate: [], byProduct: [] });
    expect(callsOf("amazon_settlement_lines", "gte")).toHaveLength(1);
    const expectedStart = new Date(`${today}T00:00:00Z`);
    expectedStart.setUTCDate(expectedStart.getUTCDate() - 89);
    expect(callsOf("amazon_settlement_lines", "lte")).toContainEqual(expect.objectContaining({ args: ["posted_at", today] }));
    expect(callsOf("amazon_settlement_lines", "gte")).toContainEqual(expect.objectContaining({ args: ["posted_at", expectedStart.toISOString().slice(0, 10)] }));
  });

  it("rechaza productId inválido antes de leer settlement lines", async () => {
    authOk();
    const res = await GET(request("?productId=not-a-uuid"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Filtros inválidos");
    expect(callsOf("amazon_settlement_lines", "select")).toHaveLength(0);
  });
});
