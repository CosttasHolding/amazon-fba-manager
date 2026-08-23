import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getOrgId: vi.fn(),
  hasReimbursementEditorAccess: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/api-handler", () => ({
  getOrgId: mocks.getOrgId,
  buildPagination: (req: NextRequest, defaultPerPage: number) => {
    const page = Number(req.nextUrl.searchParams.get("page") || "1");
    const perPage = Number(req.nextUrl.searchParams.get("perPage") || defaultPerPage);
    return { page, perPage, from: 0, to: perPage - 1 };
  },
  paginatedResponse: (data: unknown[], total: number, page: number, perPage: number) => ({
    data,
    pagination: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
  }),
}));
vi.mock("@/lib/reimbursements/access", () => ({
  hasReimbursementEditorAccess: mocks.hasReimbursementEditorAccess,
}));

import { GET } from "@/app/api/reimbursements/detected/route";
import { POST as link } from "@/app/api/reimbursements/detected/[id]/link/route";
import { POST as dismiss } from "@/app/api/reimbursements/detected/[id]/dismiss/route";

function queryChain(value: unknown) {
  const result = Promise.resolve(value) as Promise<unknown> & Record<string, ReturnType<typeof vi.fn>>;
  for (const method of ["select", "eq", "in", "is", "neq", "order", "range"]) {
    result[method] = vi.fn(() => result);
  }
  result.maybeSingle = vi.fn(() => result);
  result.single = vi.fn(() => result);
  return result;
}

describe("detected reimbursements routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrgId.mockResolvedValue("org-1");
    mocks.hasReimbursementEditorAccess.mockResolvedValue(true);
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
      from: vi.fn(),
    });
  });

  it("lists only the active organization and validates status", async () => {
    const eventsQuery = queryChain({ data: [{ id: "event-1" }], error: null, count: 1 });
    const client = await mocks.createClient();
    client.from.mockReturnValue(eventsQuery);

    const response = await GET(new NextRequest("http://localhost/api/reimbursements/detected?status=possible_duplicate_loss"));

    expect(response.status).toBe(200);
    expect(eventsQuery.eq).toHaveBeenCalledWith("org_id", "org-1");
    expect(eventsQuery.eq).toHaveBeenCalledWith("reconciliation_status", "possible_duplicate_loss");
  });

  it("rejects links to a reimbursement from another organization", async () => {
    const eventQuery = queryChain({
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        product_id: "22222222-2222-4222-8222-222222222222",
        case_id: "case-1",
        linked_reimbursement_id: null,
        reconciliation_status: "possible_existing_claim",
      },
      error: null,
    });
    const reimbursementQuery = queryChain({ data: null, error: null });
    const client = await mocks.createClient();
    client.from
      .mockReturnValueOnce(eventQuery)
      .mockReturnValueOnce(reimbursementQuery);

    const response = await link(
      new NextRequest("http://localhost/api/reimbursements/detected/11111111-1111-4111-8111-111111111111/link", {
        method: "POST",
        body: JSON.stringify({ reimbursement_id: "33333333-3333-4333-8333-333333333333" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    );

    expect(response.status).toBe(404);
    expect(reimbursementQuery.eq).toHaveBeenCalledWith("org_id", "org-1");
  });

  it("dismisses only an unlinked event with a conditional update", async () => {
    const eventQuery = queryChain({
      data: { id: "11111111-1111-4111-8111-111111111111", linked_reimbursement_id: null },
      error: null,
    });
    const updateQuery = queryChain({
      data: { id: "11111111-1111-4111-8111-111111111111", reconciliation_status: "dismissed" },
      error: null,
    });
    const client = await mocks.createClient();
    client.from
      .mockReturnValueOnce(eventQuery)
      .mockReturnValueOnce({ update: vi.fn(() => updateQuery) });

    const response = await dismiss(
      new NextRequest("http://localhost/api/reimbursements/detected/11111111-1111-4111-8111-111111111111/dismiss", { method: "POST" }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    );

    expect(response.status).toBe(200);
    expect(updateQuery.is).toHaveBeenCalledWith("linked_reimbursement_id", null);
    expect(updateQuery.eq).toHaveBeenCalledWith("org_id", "org-1");
  });
});
