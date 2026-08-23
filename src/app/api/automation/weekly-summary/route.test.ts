import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

import { GET } from "./route";

const userId = "00000000-0000-0000-0000-000000000001";
const orgA = "00000000-0000-0000-0000-000000000002";
const orgB = "00000000-0000-0000-0000-000000000003";

function request(): NextRequest {
  return new Request("http://localhost/api/automation/weekly-summary", {
    headers: { "x-automation-secret": "automation-secret" },
  }) as unknown as NextRequest;
}

function query(result: unknown) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

describe("/api/automation/weekly-summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTOMATION_SECRET = "automation-secret";
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "org_members") {
          return query({ data: [{ user_id: userId, org_id: orgA }, { user_id: userId, org_id: orgB }], error: null });
        }
        if (table === "sales") {
          return query({ data: [{ revenue: 100, units_sold: 2, net_profit: 20 }], error: null });
        }
        if (table === "notifications") {
          return query({ count: 1, error: null });
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    });
  });

  it("conserva el resumen cuando el mismo usuario pertenece a dos organizaciones", async () => {
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Object.keys(body)).toEqual([`${orgA}:${userId}`, `${orgB}:${userId}`]);
    expect(body[`${orgA}:${userId}`]).toMatchObject({ revenue_this_month: 100, active_alerts: 1 });
    expect(body[`${orgB}:${userId}`]).toMatchObject({ revenue_this_month: 100, active_alerts: 1 });
  });
});
