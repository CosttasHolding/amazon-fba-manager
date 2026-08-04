import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, PUT } from "@/app/api/research/route";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelectAll = vi.fn();
const mockSelectAllEqId = vi.fn();
const mockSelectAllEqOrg = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateEqId = vi.fn();
const mockUpdateEqOrg = vi.fn();
const mockUpdateSelect = vi.fn();
const mockUpdateSingle = vi.fn();
const mockInsert = vi.fn();
const mockInsertSelect = vi.fn();
const mockInsertSingle = vi.fn();

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/api-handler", () => ({
  getOrgId: vi.fn(() => Promise.resolve("org-1")),
}));

function setupDbMocks(
  {
    existing = null,
    resultData = { id: "row-id" },
  }: {
    existing?: Record<string, unknown> | null;
    resultData?: unknown;
  } = {}
) {
  mockMaybeSingle.mockResolvedValue({ data: existing, error: null });
  mockSelectAllEqOrg.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockSelectAllEqId.mockReturnValue({ eq: mockSelectAllEqOrg });
  mockSelectAll.mockReturnValue({ eq: mockSelectAllEqId });

  mockUpdateSingle.mockResolvedValue({ data: resultData, error: null });
  mockUpdateSelect.mockReturnValue({ single: mockUpdateSingle });
  mockUpdateEqOrg.mockReturnValue({ select: mockUpdateSelect });
  mockUpdateEqId.mockReturnValue({ eq: mockUpdateEqOrg });
  mockUpdate.mockReturnValue({ eq: mockUpdateEqId });

  mockInsertSingle.mockResolvedValue({ data: resultData, error: null });
  mockInsertSelect.mockReturnValue({ single: mockInsertSingle });
  mockInsert.mockReturnValue({ select: mockInsertSelect });

  mockFrom.mockReturnValue({ select: mockSelectAll, update: mockUpdate, insert: mockInsert });
}

const existingWithData = {
  id: "row-id",
  name: "Producto",
  estimated_monthly_sales: 1200,
  estimated_monthly_revenue: 35988,
  average_price: 29.99,
  review_count_competitor: 567,
  average_rating: 4.2,
  bsr: 1234,
  estimated_fba_fee: 8.5,
  seller_count_fba: 3,
  estimated_cogs: 5,
  competition_level: "medium",
  source_data: { original: "value" },
};

describe("PUT /api/research", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve 401 sin autenticación", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "No auth" } });
    const req = createMockRequest("http://localhost/api/research?id=row-id", {
      method: "PUT",
      body: JSON.stringify({ name: "Nuevo" }),
    });
    const res = await PUT(req as never);
    expect(res.status).toBe(401);
  });

  it("devuelve 404 si la fila no existe", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    setupDbMocks({ existing: null });

    const req = createMockRequest("http://localhost/api/research?id=row-id", {
      method: "PUT",
      body: JSON.stringify({ estimated_monthly_sales: 100 }),
    });
    const res = await PUT(req as never);
    expect(res.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("recalcula el score y score_details al recibir un campo de scoring", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    setupDbMocks({ existing: existingWithData });

    const req = createMockRequest("http://localhost/api/research?id=row-id", {
      method: "PUT",
      body: JSON.stringify({ estimated_monthly_sales: 500 }),
    });
    const res = await PUT(req as never);
    expect(res.status).toBe(200);
    const updated = mockUpdate.mock.calls[0][0];
    expect(updated.score).toBeGreaterThan(0);
    expect(updated.competition_level).toBeDefined();
    expect(updated.source_data.score_details).toBeDefined();
    expect(updated.source_data.original).toBe("value");
  });

  it("respeta un competition_level manual seteado en el payload", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    setupDbMocks({ existing: existingWithData });

    const req = createMockRequest("http://localhost/api/research?id=row-id", {
      method: "PUT",
      body: JSON.stringify({ estimated_monthly_sales: 500, competition_level: "very_high" }),
    });
    const res = await PUT(req as never);
    expect(res.status).toBe(200);
    const updated = mockUpdate.mock.calls[0][0];
    expect(updated.competition_level).toBe("very_high");
  });

  it("no recalcula el score cuando el payload no toca campos de scoring", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    setupDbMocks({ existing: existingWithData });

    const req = createMockRequest("http://localhost/api/research?id=row-id", {
      method: "PUT",
      body: JSON.stringify({ status: "approved" }),
    });
    const res = await PUT(req as never);
    expect(res.status).toBe(200);
    const updated = mockUpdate.mock.calls[0][0];
    expect(updated.score).toBeUndefined();
    expect(updated.competition_level).toBeUndefined();
    expect(updated.source_data).toBeUndefined();
    expect(updated.status).toBe("approved");
  });
});

describe("POST /api/research", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve 401 sin autenticación", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "No auth" } });
    const req = createMockRequest("http://localhost/api/research", {
      method: "POST",
      body: JSON.stringify({ name: "Nuevo" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("calcula score y score_details al crear con campos de scoring", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    setupDbMocks();

    const req = createMockRequest("http://localhost/api/research", {
      method: "POST",
      body: JSON.stringify({
        name: "Producto",
        estimated_monthly_sales: 1200,
        average_price: 29.99,
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.score).toBeGreaterThan(0);
    expect(inserted.competition_level).toBeDefined();
    expect(inserted.source_data.score_details).toBeDefined();
  });

  it("inserta sin score cuando el body no trae campos de scoring", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    setupDbMocks();

    const req = createMockRequest("http://localhost/api/research", {
      method: "POST",
      body: JSON.stringify({ name: "Producto simple" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.score).toBeUndefined();
    expect(inserted.source_data).toBeUndefined();
  });

  it("respeta un competition_level explícito en el body al crear", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    setupDbMocks();

    const req = createMockRequest("http://localhost/api/research", {
      method: "POST",
      body: JSON.stringify({
        name: "Producto",
        estimated_monthly_sales: 1200,
        competition_level: "high",
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.competition_level).toBe("high");
  });
});