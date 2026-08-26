import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const SETTINGS_SELECT =
  "id, user_id, full_name, company, country, marketplace, default_fba_fee, default_referral_fee, default_shipping_cost, default_storage_cost, target_roi, currency, tax_rate, theme, language, avatar_url, rate_usd_cny, rate_usd_ars, rates_updated_at, high_contrast, current_org_id, created_at, updated_at";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/api-handler", () => ({
  createApiHandler: (handler: (context: unknown) => Promise<Response>) =>
    (req: unknown) => handler({ supabase: mockSupabase, user: { id: "user-1" }, req }),
}));

const mockSupabase = {
  from: mocks.from,
};

function makeQuery(results: Array<unknown>) {
  let resultIndex = 0;
  const query = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve(results[resultIndex++])),
  };
  mocks.from.mockReturnValue(query);
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue(mockSupabase);
});

describe("/api/settings", () => {
  it("GET existing row selects only preferences and excludes the Drive token", async () => {
    const query = makeQuery([{
      data: { id: "settings-1", user_id: "user-1", language: "es", drive_refresh_token: "secret" },
      error: null,
    }]);
    const { GET } = await import("./route");

    const response = await GET(createMockRequest("http://localhost/api/settings"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(query.select).toHaveBeenCalledWith(SETTINGS_SELECT);
    expect(query.select).not.toHaveBeenCalledWith("*");
    expect(body).toEqual({ id: "settings-1", user_id: "user-1", language: "es" });
    expect(JSON.stringify(body)).not.toContain("drive_refresh_token");
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  it("GET missing row creates settings with an explicit safe response projection", async () => {
    const query = makeQuery([
      { data: null, error: { code: "PGRST116" } },
      { data: { id: "settings-1", user_id: "user-1", drive_refresh_token: "secret" }, error: null },
    ]);
    const { GET } = await import("./route");

    const response = await GET(createMockRequest("http://localhost/api/settings"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(query.insert).toHaveBeenCalledWith({ user_id: "user-1" });
    expect(query.select).toHaveBeenCalledWith(SETTINGS_SELECT);
    expect(body).toEqual({ id: "settings-1", user_id: "user-1" });
    expect(JSON.stringify(body)).not.toContain("drive_refresh_token");
  });

  it("PUT returns only the safe settings projection", async () => {
    const query = makeQuery([
      { data: { id: "settings-1" }, error: null },
      { data: { id: "settings-1", language: "en", drive_refresh_token: "secret" }, error: null },
    ]);
    const { PUT } = await import("./route");

    const response = await PUT(createMockRequest("http://localhost/api/settings", {
      method: "PUT",
      body: JSON.stringify({ language: "en" }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(query.update).toHaveBeenCalledWith({ language: "en" });
    expect(query.select).toHaveBeenCalledWith(SETTINGS_SELECT);
    expect(body).toEqual({ id: "settings-1", language: "en" });
    expect(JSON.stringify(body)).not.toContain("drive_refresh_token");
  });
});
