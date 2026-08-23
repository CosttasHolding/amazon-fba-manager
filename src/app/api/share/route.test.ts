import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/api-handler", () => ({
  createApiHandler: vi.fn((handler) => handler),
  getOrgId: vi.fn(),
}));

import { DELETE, GET, POST } from "@/app/api/share/route";

describe("/api/share", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["GET", GET],
    ["POST", POST],
    ["DELETE", DELETE],
  ])("deshabilita %s antes de autenticar o consultar datos", async (_method, handler) => {
    const response = await handler(
      new Request("http://localhost/api/share") as unknown as NextRequest,
    );

    expect(response.status).toBe(503);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
