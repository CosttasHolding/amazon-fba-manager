import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getOrgId: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/api-handler", () => ({ getOrgId: mocks.getOrgId }));

import { GET, PUT } from "@/app/api/returns/[id]/route";

function queryChain(value: unknown) {
  const result = Promise.resolve(value) as Promise<unknown> & Record<string, ReturnType<typeof vi.fn>>;
  for (const method of ["select", "eq", "maybeSingle", "single", "update"]) {
    result[method] = vi.fn(() => result);
  }
  return result;
}

const returnId = "11111111-1111-4111-8111-111111111111";

describe("/api/returns/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrgId.mockResolvedValue("org-1");
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
      from: vi.fn(),
    });
  });

  it("rejects malformed ids before touching Supabase", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/returns/not-a-uuid"),
      { params: Promise.resolve({ id: "not-a-uuid" }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("scopes detail reads to the active organization", async () => {
    const returnsQuery = queryChain({ data: { id: returnId, org_id: "org-1" }, error: null });
    const client = await mocks.createClient();
    client.from.mockReturnValue(returnsQuery);

    const response = await GET(
      new NextRequest(`http://localhost/api/returns/${returnId}`),
      { params: Promise.resolve({ id: returnId }) },
    );

    expect(response.status).toBe(200);
    expect(returnsQuery.eq).toHaveBeenCalledWith("id", returnId);
    expect(returnsQuery.eq).toHaveBeenCalledWith("org_id", "org-1");
  });

  it("allows editors to advance status without accepting tenant fields", async () => {
    const membershipQuery = queryChain({ data: { role: "editor" }, error: null });
    const returnsQuery = queryChain({ data: { id: returnId, status: "inspected" }, error: null });
    const client = await mocks.createClient();
    client.from.mockReturnValueOnce(membershipQuery).mockReturnValueOnce(returnsQuery);

    const response = await PUT(
      new NextRequest(`http://localhost/api/returns/${returnId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "inspected", org_id: "org-2", user_id: "user-2" }),
      }),
      { params: Promise.resolve({ id: returnId }) },
    );

    expect(response.status).toBe(200);
    expect(returnsQuery.update).toHaveBeenCalledWith({ status: "inspected" });
    expect(returnsQuery.eq).toHaveBeenCalledWith("org_id", "org-1");
  });
});
