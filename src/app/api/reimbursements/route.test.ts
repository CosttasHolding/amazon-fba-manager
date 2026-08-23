import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getOrgId: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/api-handler", () => ({ getOrgId: mocks.getOrgId }));

import { POST } from "@/app/api/reimbursements/route";

function queryChain(value: unknown) {
  const result = Promise.resolve(value) as Promise<unknown> & Record<string, ReturnType<typeof vi.fn>>;
  for (const method of ["select", "eq", "is", "maybeSingle", "insert", "single"]) {
    result[method] = vi.fn(() => result);
  }
  return result;
}

describe("POST /api/reimbursements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrgId.mockResolvedValue("org-1");
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
      from: vi.fn(),
    });
  });

  it("does not accept paid status from the client", async () => {
    const membershipQuery = queryChain({ data: { role: "editor" }, error: null });
    const client = await mocks.createClient();
    client.from.mockReturnValue(membershipQuery);

    const response = await POST(new NextRequest("http://localhost/api/reimbursements", {
      method: "POST",
      body: JSON.stringify({
        product_id: null,
        return_id: null,
        reimbursement_type: "lost_warehouse",
        quantity: 1,
        amount: 100,
        status: "paid",
      }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(400);
  });

  it("rejects a product reference outside the active organization", async () => {
    const membershipQuery = queryChain({ data: { role: "editor" }, error: null });
    const productQuery = queryChain({ data: null, error: null });
    const client = await mocks.createClient();
    client.from
      .mockReturnValueOnce(membershipQuery)
      .mockReturnValueOnce(productQuery);

    const response = await POST(new NextRequest("http://localhost/api/reimbursements", {
      method: "POST",
      body: JSON.stringify({
        product_id: "11111111-1111-4111-8111-111111111111",
        return_id: null,
        reimbursement_type: "lost_warehouse",
        quantity: 1,
        amount: 100,
      }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(400);
    expect(productQuery.eq).toHaveBeenCalledWith("org_id", "org-1");
  });
});
