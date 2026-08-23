import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));

import SharedDashboardPage from "@/app/share/[token]/page";

describe("/share/[token]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns not found before querying service role", async () => {
    await expect(
      SharedDashboardPage({ params: Promise.resolve({ token: "token-1" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mocks.notFound).toHaveBeenCalledOnce();
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });
});
