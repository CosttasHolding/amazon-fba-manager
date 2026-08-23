import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  sendEmail: vi.fn(),
  buildAlertEmailHtml: vi.fn(),
  getForecastSuggestions: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
  buildAlertEmailHtml: mocks.buildAlertEmailHtml,
}));

vi.mock("@/lib/forecasting", () => ({
  getForecastSuggestions: mocks.getForecastSuggestions,
}));

import { GET as getAlerts } from "@/app/api/cron/alerts/route";
import { GET as getReports } from "@/app/api/cron/reports/route";
import { GET as getWeeklySummary } from "@/app/api/automation/weekly-summary/route";
import { GET as getNotifications } from "@/app/api/automation/notifications/route";
import { GET as getForecasting } from "@/app/api/automation/forecasting/route";

function request(headers: Record<string, string>): NextRequest {
  return new Request("http://localhost/api/cron", { headers }) as unknown as NextRequest;
}

describe("cron secret guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
    delete process.env.AUTOMATION_SECRET;
  });

  it("rechaza alerts con CRON_SECRET ausente incluso si el header parece coincidir", async () => {
    const response = await getAlerts(request({ authorization: "Bearer undefined" }));

    expect(response.status).toBe(401);
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("rechaza reports con CRON_SECRET ausente", async () => {
    const response = await getReports(request({ authorization: "Bearer undefined" }));

    expect(response.status).toBe(401);
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("rechaza forecasting si falta el secreto específico de automation y también CRON_SECRET", async () => {
    const response = await getForecasting(request({
      "x-automation-secret": "undefined",
      authorization: "Bearer undefined",
    }));

    expect(response.status).toBe(401);
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("rechaza weekly-summary y notifications con Bearer undefined", async () => {
    const headers = { authorization: "Bearer undefined" };

    const weeklySummaryResponse = await getWeeklySummary(request(headers));
    const notificationsResponse = await getNotifications(request(headers));

    expect(weeklySummaryResponse.status).toBe(401);
    expect(notificationsResponse.status).toBe(401);
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("requiere un x-org-id UUID después de autenticar", async () => {
    process.env.AUTOMATION_SECRET = "automation-secret";

    const response = await getForecasting(request({
      "x-automation-secret": "automation-secret",
      "x-org-id": "not-a-uuid",
    }));

    expect(response.status).toBe(400);
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("procesa solo memberships activos del org solicitado", async () => {
    process.env.AUTOMATION_SECRET = "automation-secret";
    const orgId = "00000000-0000-0000-0000-000000000001";
    const membershipQuery = Promise.resolve({
      data: [{ user_id: "user-in-org" }],
      error: null,
    }) as Promise<unknown> & Record<string, ReturnType<typeof vi.fn>>;
    membershipQuery.select = vi.fn(() => membershipQuery);
    membershipQuery.eq = vi.fn(() => membershipQuery);

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "org_members") return membershipQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    };
    mocks.createServiceRoleClient.mockReturnValue(supabase);
    mocks.getForecastSuggestions.mockResolvedValue([
      { urgency: "critical", product_id: "product-in-org" },
    ]);

    const response = await getForecasting(request({
      "x-automation-secret": "automation-secret",
      "x-org-id": orgId,
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ org_id: orgId, criticalCount: 1, warningCount: 0 });
    expect(membershipQuery.eq).toHaveBeenCalledWith("org_id", orgId);
    expect(membershipQuery.eq).toHaveBeenCalledWith("status", "active");
    expect(mocks.getForecastSuggestions).toHaveBeenCalledWith("user-in-org", orgId, supabase);
    expect(mocks.getForecastSuggestions).not.toHaveBeenCalledWith("user-from-other-org", orgId, supabase);
  });
});
