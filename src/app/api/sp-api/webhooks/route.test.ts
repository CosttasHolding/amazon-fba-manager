import { beforeEach, describe, it, expect, vi } from "vitest";
import type { NextRequest } from "next/server";

const capturedErrors: unknown[] = [];
const insertCalls: { table: string; payload: unknown }[] = [];
let subscriptionData: unknown = null;
let connectionData: unknown = null;
let membershipData: unknown = null;
vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
  capturedErrors.push(args);
});
vi.spyOn(console, "warn").mockImplementation(() => {});

const stubChain = (table: string) => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    not: () => chain,
    order: () => chain,
    limit: () => chain,
    update: () => chain,
    maybeSingle: async () => ({
      data:
        table === "sp_api_webhook_subscriptions"
          ? subscriptionData
          : table === "sp_api_connections"
            ? connectionData
            : table === "org_members"
              ? membershipData
              : null,
      error: null,
    }),
    single: async () => ({ data: null, error: null }),
    insert: (payload: unknown) => {
      insertCalls.push({ table, payload });
      return chain;
    },
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(resolve),
  };
  return chain;
};

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({ from: (table: string) => stubChain(table) }),
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
  beforeEach(() => {
    insertCalls.length = 0;
    subscriptionData = null;
    connectionData = null;
    membershipData = null;
  });

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
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(insertCalls).toHaveLength(0);
  });

  it("no procesa una suscripción cuya conexión no pertenece a la misma org y usuario", async () => {
    subscriptionData = {
      id: "subscription-1",
      user_id: "user-1",
      org_id: "org-1",
      connection_id: "connection-1",
    };
    membershipData = { org_id: "org-1" };

    const res = await post(
      JSON.stringify({
        notificationType: "ORDER_STATUS_CHANGED",
        notificationId: "qa-invalid-connection",
        payload: { notificationMetadata: { subscriptionId: "subscription-1" } },
      }),
      "Bearer test-secret-local"
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(insertCalls).toHaveLength(0);
  });
});
