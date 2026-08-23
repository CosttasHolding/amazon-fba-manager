import { describe, it, expect, vi } from "vitest";
import type { NextRequest } from "next/server";

const capturedErrors: unknown[] = [];
vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
  capturedErrors.push(args);
});
vi.spyOn(console, "warn").mockImplementation(() => {});

const stubChain = () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    update: () => chain,
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
    insert: async () => ({ data: null, error: { message: "FK violation simulada" } }),
  };
  return chain;
};

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({ from: () => stubChain() }),
}));

async function post(body: string, auth?: string) {
  process.env.SP_API_WEBHOOK_SECRET = "test-secret-local";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = auth;
  const req = new Request("http://localhost/api/sp-api/webhooks", {
    method: "POST",
    headers,
    body,
  });
  const { POST } = await import("./route");
  return POST(req as unknown as NextRequest);
}

describe("webhook happy-path con secret configurado", () => {
  it("Bearer correcto + subscriptionId inexistente → 200 received", async () => {
    capturedErrors.length = 0;
    const res = await post(
      JSON.stringify({
        notificationType: "ORDER_STATUS_CHANGED",
        notificationId: "qa-live-001",
        payload: { notificationMetadata: { subscriptionId: "qa-sub-inexistente" } },
      }),
      "Bearer test-secret-local"
    );
    console.log("STATUS:", res.status);
    console.log("ERRORES CAPTURADOS:", JSON.stringify(capturedErrors, replacer, 2));
    expect(res.status).toBe(200);
  });
});

function replacer(_k: string, v: unknown) {
  if (v instanceof Error) return { name: v.name, message: v.message, stack: v.stack };
  return v;
}
