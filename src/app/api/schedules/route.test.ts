import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest } from "@/lib/test-utils/mock-request";
import { calculateNextRunAt } from "@/lib/schedules";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getOrgId: vi.fn(),
  inserted: [] as unknown[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/api-handler", () => ({
  createApiHandler: (handler: (context: unknown) => Promise<Response>) =>
    (req: unknown) => handler({
      supabase: mockSupabase,
      user: { id: "00000000-0000-0000-0000-000000000001" },
      orgId: "00000000-0000-0000-0000-000000000002",
      req,
    }),
  getOrgId: mocks.getOrgId,
}));

function queryChain(result: unknown) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn().mockResolvedValue(result),
    insert: vi.fn((payload: unknown) => {
      mocks.inserted.push(payload);
      return chain;
    }),
    update: vi.fn(() => chain),
    single: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: "00000000-0000-0000-0000-000000000001" } }, error: null }),
  },
  from: vi.fn(),
};

import { PATCH, POST } from "./route";

describe("/api/schedules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.inserted.length = 0;
    mocks.getOrgId.mockResolvedValue("00000000-0000-0000-0000-000000000002");
    mocks.createClient.mockResolvedValue(mockSupabase);
  });

  it("inserta las columnas reales de 013 y calcula next_run_at", async () => {
    const query = queryChain({ data: { id: "schedule-1" }, error: null });
    mockSupabase.from.mockReturnValue(query);

    const response = await POST(createMockRequest("http://localhost/api/schedules", {
      method: "POST",
      body: JSON.stringify({
        name: "Resumen semanal",
        template: "profitability",
        frequency: "weekly",
        day_of_week: 1,
        time: "08:30",
        channel: "email",
        format: "excel",
        recipients: ["owner@example.com"],
      }),
    }));

    expect(response.status).toBe(200);
    const payload = mocks.inserted[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      template: "profitability",
      channel: "email",
      format: "excel",
      time: "08:30",
      day_of_week: 1,
      day_of_month: null,
      recipients: ["owner@example.com"],
      enabled: true,
    });
    expect(payload).not.toHaveProperty("type");
    expect(payload).not.toHaveProperty("config");
    expect(typeof payload.next_run_at).toBe("string");
    expect(Number.isNaN(Date.parse(payload.next_run_at as string))).toBe(false);
  });

  it("rechaza el contrato legacy type/config", async () => {
    const query = queryChain({ data: null, error: null });
    mockSupabase.from.mockReturnValue(query);

    const response = await POST(createMockRequest("http://localhost/api/schedules", {
      method: "POST",
      body: JSON.stringify({ name: "Legacy", type: "weekly", frequency: "weekly", config: {} }),
    }));

    expect(response.status).toBe(400);
    expect(query.insert).not.toHaveBeenCalled();
  });

  it("actualiza template/channel/format y mantiene next_run_at válido", async () => {
    const query = queryChain({
      data: {
        name: "Reporte",
        template: "inventory",
        frequency: "monthly",
        day_of_week: null,
        day_of_month: 31,
        time: "08:00:00",
        channel: "email",
        recipients: [],
        format: "excel",
        enabled: true,
      },
      error: null,
    });
    mockSupabase.from.mockReturnValue(query);

    const response = await PATCH(createMockRequest("http://localhost/api/schedules", {
      method: "PATCH",
      headers: { "x-org-id": "00000000-0000-0000-0000-000000000002" },
      body: JSON.stringify({
        id: "00000000-0000-0000-0000-000000000003",
        template: "roi-ranking",
        channel: "both",
        format: "excel",
      }),
    }));

    expect(response.status).toBe(200);
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({
      template: "roi-ranking",
      channel: "both",
      format: "excel",
      next_run_at: expect.any(String),
    }));
  });

  it("calcula una fecha existente para el día 31 aunque el mes actual tenga menos días", () => {
    const next = calculateNextRunAt(
      { frequency: "monthly", time: "08:00", day_of_month: 31 },
      new Date("2026-02-10T12:00:00Z")
    );
    expect(Number.isNaN(Date.parse(next))).toBe(false);
  });

  it("rechaza formatos sin implementación en el cron", async () => {
    const query = queryChain({ data: null, error: null });
    mockSupabase.from.mockReturnValue(query);

    const response = await POST(createMockRequest("http://localhost/api/schedules", {
      method: "POST",
      body: JSON.stringify({
        name: "PDF no soportado",
        template: "inventory",
        frequency: "daily",
        format: "pdf",
      }),
    }));

    expect(response.status).toBe(400);
    expect(query.insert).not.toHaveBeenCalled();
  });
});
