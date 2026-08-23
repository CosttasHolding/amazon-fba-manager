import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  sendEmail: vi.fn(),
  buildAlertEmailHtml: vi.fn(() => "html"),
  calculateNextRunAt: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));
vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
  buildAlertEmailHtml: mocks.buildAlertEmailHtml,
}));
vi.mock("@/lib/schedules", () => ({
  calculateNextRunAt: mocks.calculateNextRunAt,
}));

import { GET } from "./route";

function query(result: unknown) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    not: vi.fn(() => chain),
    maybeSingle: vi.fn().mockResolvedValue(result),
    update: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

function request() {
  return createMockRequest("http://localhost/api/cron/reports", {
    headers: { authorization: "Bearer cron-secret" },
  });
}

describe("/api/cron/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    mocks.calculateNextRunAt.mockReturnValue("2026-08-30T10:15:00.000Z");
  });

  it("calcula la próxima ejecución con la configuración real del schedule", async () => {
    const schedule = {
      id: "schedule-1",
      user_id: "00000000-0000-0000-0000-000000000001",
      org_id: "00000000-0000-0000-0000-000000000002",
      name: "Inventario",
      template: "inventory",
      frequency: "weekly",
      day_of_week: 0,
      day_of_month: null,
      time: "10:15",
      channel: "in_app",
      format: "excel",
      enabled: true,
      next_run_at: "2026-08-23T10:15:00.000Z",
      last_sent_at: null,
      users: null,
    };
    const scheduleQuery = query({ data: [schedule], error: null });
    const membershipQuery = query({ data: { user_id: schedule.user_id }, error: null });
    const productsQuery = query({ data: [{ name: "Producto", sku: "SKU", stock_available: 2, stock_status: "normal", sales_velocity_30d: 1 }], error: null });
    const historyQuery = query({ error: null });
    const storage = {
      upload: vi.fn().mockResolvedValue({ error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed" }, error: null }),
    };
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "scheduled_reports") return scheduleQuery;
        if (table === "org_members") return membershipQuery;
        if (table === "products_with_inventory") return productsQuery;
        if (table === "alert_history") return historyQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
      storage: {
        from: vi.fn(() => storage),
      },
    };
    mocks.createServiceRoleClient.mockReturnValue(supabase);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(mocks.calculateNextRunAt).toHaveBeenCalledWith({
      frequency: "weekly",
      time: "10:15",
      day_of_week: 0,
      day_of_month: null,
    });
    expect(scheduleQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      next_run_at: "2026-08-30T10:15:00.000Z",
    }));
  });

  it("no procesa schedules PDF porque el cron solo genera Excel", async () => {
    const scheduleQuery = query({
      data: [{
        id: "schedule-pdf",
        user_id: "00000000-0000-0000-0000-000000000001",
        org_id: "00000000-0000-0000-0000-000000000002",
        name: "PDF legacy",
        template: "inventory",
        frequency: "daily",
        day_of_week: null,
        day_of_month: null,
        time: "08:00",
        channel: "email",
        format: "pdf",
        enabled: true,
        next_run_at: "2026-08-23T08:00:00.000Z",
        last_sent_at: null,
        users: null,
      }],
      error: null,
    });
    const membershipQuery = query({ data: { user_id: "user" }, error: null });
    const supabase = {
      from: vi.fn((table: string) => table === "scheduled_reports" ? scheduleQuery : membershipQuery),
      storage: { from: vi.fn() },
    };
    mocks.createServiceRoleClient.mockReturnValue(supabase);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.generated).toBe(0);
    expect(body.failures).toEqual([{ id: "schedule-pdf", name: "PDF legacy", error: "Only Excel scheduled reports are supported" }]);
    expect(mocks.calculateNextRunAt).not.toHaveBeenCalled();
  });
});
