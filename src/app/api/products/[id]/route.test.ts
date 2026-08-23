import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT } from "@/app/api/products/[id]/route";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const {
  mockGetUser,
  mockFrom,
  mockUpdate,
  mockEq,
  mockSelect,
  mockSingle,
  mockGetOrgId,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockUpdate: vi.fn(),
  mockEq: vi.fn(),
  mockSelect: vi.fn(),
  mockSingle: vi.fn(),
  mockGetOrgId: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}));

vi.mock("@/lib/api-handler", () => ({
  getOrgId: mockGetOrgId,
}));

describe("PUT /api/products/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
    mockGetOrgId.mockResolvedValue("test-org-id");
    mockUpdate.mockReturnThis();
    mockEq.mockReturnThis();
    mockSelect.mockReturnThis();
    mockSingle.mockResolvedValue({ data: { id: "prod-1", duty_rate: 0.25 }, error: null });
    mockFrom.mockReturnValue({
      update: mockUpdate,
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
    });
  });

  it("usa las columnas generadas redondeadas para el detalle", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "prod-1",
        unit_cost: 10,
        duty_rate: 0.25,
        shipping_cost: 2,
        prep_cost: 1,
        taxes: 0,
        sale_price: 30,
        fba_fee: 3.22,
        referral_fee: 4.5,
        storage_fee_monthly: 0,
        other_fees: 0,
        total_cost: 15.5,
        net_profit: 6.78,
        roi: 43.74,
      },
      error: null,
    });

    const req = createMockRequest("http://localhost/api/products/prod-1");
    const res = await GET(req, { params: { id: "550e8400-e29b-41d4-a716-446655440000" } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.total_cost).toBe(15.5);
    expect(json.profit).toBe(6.78);
    expect(json.roi).toBe(43.74);
  });

  it("valida y actualiza duty_rate sin perder el scope de organización", async () => {
    const req = createMockRequest("http://localhost/api/products/prod-1", {
      method: "PUT",
      body: JSON.stringify({ duty_rate: 0.25 }),
    });

    const res = await PUT(req, { params: { id: "550e8400-e29b-41d4-a716-446655440000" } });

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ duty_rate: 0.25 });
    expect(mockEq).toHaveBeenCalledWith("org_id", "test-org-id");
  });
});
