import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mocks = vi.hoisted(() => ({ rateLimit: vi.fn() }));

vi.mock("@/lib/rate-limit", () => ({
  buildRateLimitKey: (ip: string, route: string) => `${ip}:${route}`,
  rateLimit: mocks.rateLimit,
}));

import { enforceDriveRateLimit } from "./rate-limit";

describe("Drive rate limit helper", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a controlled 429 response when the shared limiter blocks", async () => {
    mocks.rateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 30000 });

    const response = await enforceDriveRateLimit(createMockRequest("http://localhost/api/drive/connections"));

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("30");
    expect(await response?.json()).toEqual({ error: "Demasiadas solicitudes. Intente nuevamente más tarde." });
    expect(mocks.rateLimit).toHaveBeenCalledWith("unknown:/api/drive/connections", 60, 60000);
  });

  it("does not add a fail-open path when the shared limiter allows", async () => {
    mocks.rateLimit.mockResolvedValue({ allowed: true, remaining: 59, resetAt: Date.now() + 60000 });

    await expect(enforceDriveRateLimit(createMockRequest("http://localhost/api/drive/auth"))).resolves.toBeNull();
  });

  it("uses one stable bucket for connection paths with different IDs", async () => {
    mocks.rateLimit.mockResolvedValue({ allowed: true, remaining: 59, resetAt: Date.now() + 60000 });

    await enforceDriveRateLimit(createMockRequest("http://localhost/api/drive/connections/connection-1"));
    await enforceDriveRateLimit(createMockRequest("http://localhost/api/drive/connections/connection-2"));

    expect(mocks.rateLimit.mock.calls[0][0]).toBe("unknown:/api/drive/connections/:id");
    expect(mocks.rateLimit.mock.calls[1][0]).toBe("unknown:/api/drive/connections/:id");
  });
});
