import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mockServiceClient = { from: vi.fn() };

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => mockServiceClient),
}));

import { GET } from "@/app/api/share/[token]/route";

describe("GET /api/share/[token]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deshabilita el endpoint antes de consultar service role", async () => {
    const response = await GET(
      new Request("http://localhost/api/share/token-1") as unknown as NextRequest,
      { params: Promise.resolve({ token: "token-1" }) },
    );

    expect(response.status).toBe(404);
    expect(mockServiceClient.from).not.toHaveBeenCalled();
  });
});
