import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, DELETE } from "@/app/api/trash/route";
import { POST as RESTORE_POST } from "@/app/api/trash/restore/route";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const GROUP_ID = "22222222-2222-4222-8222-222222222222";
const SUPPLIER_ID = "33333333-3333-4333-8333-333333333333";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/api-handler", () => ({
  getOrgId: vi.fn(() => Promise.resolve("org-1")),
}));

type DbCall = { table: string; op: string; args: unknown[] };

type MockResult = { data: unknown; error: unknown };

type MockChain = Promise<MockResult> & {
  select: (...args: unknown[]) => MockChain;
  eq: (...args: unknown[]) => MockChain;
  is: (...args: unknown[]) => MockChain;
  not: (...args: unknown[]) => MockChain;
  ilike: (...args: unknown[]) => MockChain;
  gte: (...args: unknown[]) => MockChain;
  order: (...args: unknown[]) => MockChain;
  update: (...args: unknown[]) => MockChain;
  delete: (...args: unknown[]) => MockChain;
  single: () => Promise<MockResult>;
  maybeSingle: () => Promise<MockResult>;
};

let dbCalls: DbCall[] = [];

function createChain(table: string, calls: DbCall[], result: MockResult): MockChain {
  const base = Promise.resolve(result) as MockChain;
  const link = (op: string) => (...args: unknown[]): MockChain => {
    calls.push({ table, op, args });
    return base;
  };
  return Object.assign(base, {
    select: link("select"),
    eq: link("eq"),
    is: link("is"),
    not: link("not"),
    ilike: link("ilike"),
    gte: link("gte"),
    order: link("order"),
    update: link("update"),
    delete: link("delete"),
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
  });
}

function setupDb(config: Record<string, MockResult> = {}) {
  dbCalls = [];
  mockFrom.mockImplementation((table: string) =>
    createChain(table, dbCalls, config[table] ?? { data: [], error: null })
  );
}

function callsOf(table: string, op: string): DbCall[] {
  return dbCalls.filter((c) => c.table === table && c.op === op);
}

function authOk() {
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
}

function authFail() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "No auth" } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/trash", () => {
  it("devuelve 401 sin autenticación", async () => {
    authFail();
    setupDb();

    const req = createMockRequest("http://localhost/api/trash?entity=suppliers") as never;
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("lista solo filas borradas de la entidad scoped por organización", async () => {
    authOk();
    setupDb({
      suppliers: {
        data: [
          { id: SUPPLIER_ID, name: "Acme", deleted_at: "2026-08-20T10:00:00.000Z" },
          { id: "s2", name: "Beta", deleted_at: "2026-08-21T09:00:00.000Z" },
        ],
        error: null,
      },
    });

    const req = createMockRequest("http://localhost/api/trash?entity=suppliers") as never;
    const res = await GET(req);
    expect(res.status).toBe(200);

    expect(callsOf("suppliers", "eq")).toContainEqual(
      expect.objectContaining({ args: ["org_id", "org-1"] })
    );
    expect(callsOf("suppliers", "not")).toContainEqual(
      expect.objectContaining({ args: ["deleted_at", "is", null] })
    );
    expect(callsOf("suppliers", "order")).toContainEqual(
      expect.objectContaining({ args: ["deleted_at", { ascending: false }] })
    );

    const body = await res.json();
    expect(body.data).toEqual([
      { id: SUPPLIER_ID, name: "Acme", deleted_at: "2026-08-20T10:00:00.000Z" },
      { id: "s2", name: "Beta", deleted_at: "2026-08-21T09:00:00.000Z" },
    ]);
  });

  it("filtra con ilike sobre la columna mapeada cuando hay q", async () => {
    authOk();
    setupDb({
      suppliers: { data: [], error: null },
    });

    const req = createMockRequest(
      "http://localhost/api/trash?entity=suppliers&q=acm"
    ) as never;
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(callsOf("suppliers", "ilike")).toContainEqual(
      expect.objectContaining({ args: ["name", "%acm%"] })
    );
  });

  it("devuelve 400 si la entidad no es gestionable", async () => {
    authOk();
    setupDb();

    const req = createMockRequest("http://localhost/api/trash?entity=sales") as never;
    const res = await GET(req);
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/trash", () => {
  it("borra definitivamente una fila normal scoped por organización", async () => {
    authOk();
    setupDb({
      suppliers: { data: [{ id: SUPPLIER_ID }], error: null },
    });

    const req = createMockRequest("http://localhost/api/trash", {
      method: "DELETE",
      body: JSON.stringify({ entity: "suppliers", id: SUPPLIER_ID }),
    }) as never;
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const deletes = callsOf("suppliers", "delete");
    expect(deletes).toHaveLength(1);
    const eqs = callsOf("suppliers", "eq");
    expect(eqs.some((c) => c.args[0] === "id" && c.args[1] === SUPPLIER_ID)).toBe(true);
    expect(eqs.some((c) => c.args[0] === "org_id" && c.args[1] === "org-1")).toBe(true);
    expect(callsOf("suppliers", "update")).toHaveLength(0);

    const body = await res.json();
    expect(body.data.success).toBe(true);
  });

  it("borra grupos en cascada: productos primero y luego el grupo", async () => {
    authOk();
    setupDb({
      research_groups: { data: [{ id: GROUP_ID }], error: null },
    });

    const req = createMockRequest("http://localhost/api/trash", {
      method: "DELETE",
      body: JSON.stringify({ entity: "research_groups", id: GROUP_ID }),
    }) as never;
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    expect(callsOf("product_research", "delete")).toHaveLength(1);
    expect(callsOf("product_research", "eq")).toContainEqual(
      expect.objectContaining({ args: ["group_id", GROUP_ID] })
    );
    expect(callsOf("research_groups", "delete")).toHaveLength(1);
    expect(callsOf("research_groups", "eq")).toContainEqual(
      expect.objectContaining({ args: ["id", GROUP_ID] })
    );
    expect(callsOf("research_groups", "update")).toHaveLength(0);
    expect(callsOf("product_research", "update")).toHaveLength(0);

    const firstProductDelete = dbCalls.findIndex(
      (c) => c.table === "product_research" && c.op === "delete"
    );
    const groupDelete = dbCalls.findIndex(
      (c) => c.table === "research_groups" && c.op === "delete"
    );
    expect(firstProductDelete).toBeLessThan(groupDelete);
  });

  it("devuelve 400 con body inválido o entidad no gestionable", async () => {
    authOk();
    setupDb();

    const badBody = createMockRequest("http://localhost/api/trash", {
      method: "DELETE",
      body: JSON.stringify({ entity: "suppliers", id: "no-es-uuid" }),
    }) as never;
    const resBadBody = await DELETE(badBody);
    expect(resBadBody.status).toBe(400);

    const badEntity = createMockRequest("http://localhost/api/trash", {
      method: "DELETE",
      body: JSON.stringify({ entity: "sales", id: SUPPLIER_ID }),
    }) as never;
    const resBadEntity = await DELETE(badEntity);
    expect(resBadEntity.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("devuelve 404 si la fila no existe en la organización", async () => {
    authOk();
    setupDb({ suppliers: { data: null, error: null } });

    const req = createMockRequest("http://localhost/api/trash", {
      method: "DELETE",
      body: JSON.stringify({ entity: "suppliers", id: SUPPLIER_ID }),
    }) as never;
    const res = await DELETE(req);
    expect(res.status).toBe(404);
    expect(callsOf("suppliers", "delete")).toHaveLength(0);
  });
});

describe("POST /api/trash/restore", () => {
  it("restaura una fila normal desmarcando deleted_at", async () => {
    authOk();
    setupDb({
      suppliers: {
        data: { id: SUPPLIER_ID, deleted_at: "2026-08-20T10:00:00.000Z" },
        error: null,
      },
    });

    const req = createMockRequest("http://localhost/api/trash/restore", {
      method: "POST",
      body: JSON.stringify({ entity: "suppliers", id: SUPPLIER_ID }),
    }) as never;
    const res = await RESTORE_POST(req);
    expect(res.status).toBe(200);

    const updates = callsOf("suppliers", "update");
    expect(updates).toHaveLength(1);
    expect(updates[0].args[0]).toEqual({ deleted_at: null });
    const eqs = callsOf("suppliers", "eq");
    expect(eqs.some((c) => c.args[0] === "id" && c.args[1] === SUPPLIER_ID)).toBe(true);
    expect(eqs.some((c) => c.args[0] === "org_id" && c.args[1] === "org-1")).toBe(true);
    expect(callsOf("product_research", "update")).toHaveLength(0);
  });

  it("restaura un grupo y solo los productos borrados junto a él", async () => {
    authOk();
    setupDb({
      research_groups: {
        data: { id: GROUP_ID, deleted_at: "2026-08-20T12:00:00.000Z" },
        error: null,
      },
    });

    const req = createMockRequest("http://localhost/api/trash/restore", {
      method: "POST",
      body: JSON.stringify({ entity: "research_groups", id: GROUP_ID }),
    }) as never;
    const res = await RESTORE_POST(req);
    expect(res.status).toBe(200);

    const groupUpdates = callsOf("research_groups", "update");
    expect(groupUpdates).toHaveLength(1);
    expect(groupUpdates[0].args[0]).toEqual({ deleted_at: null });

    const productUpdates = callsOf("product_research", "update");
    expect(productUpdates).toHaveLength(1);
    expect(productUpdates[0].args[0]).toEqual({ deleted_at: null });
    expect(callsOf("product_research", "eq")).toContainEqual(
      expect.objectContaining({ args: ["group_id", GROUP_ID] })
    );
    const gtes = callsOf("product_research", "gte");
    expect(gtes).toHaveLength(1);
    expect(gtes[0].args).toEqual(["deleted_at", "2026-08-20T12:00:00.000Z"]);
  });

  it("no toca productos si el grupo no está en papelera", async () => {
    authOk();
    setupDb({
      research_groups: {
        data: { id: GROUP_ID, deleted_at: null },
        error: null,
      },
    });

    const req = createMockRequest("http://localhost/api/trash/restore", {
      method: "POST",
      body: JSON.stringify({ entity: "research_groups", id: GROUP_ID }),
    }) as never;
    const res = await RESTORE_POST(req);
    expect(res.status).toBe(200);
    expect(callsOf("product_research", "update")).toHaveLength(0);
    expect(callsOf("research_groups", "update")).toHaveLength(1);
  });

  it("devuelve 400 con entidad inválida y 404 si no existe", async () => {
    authOk();
    setupDb({ suppliers: { data: null, error: null } });

    const badEntity = createMockRequest("http://localhost/api/trash/restore", {
      method: "POST",
      body: JSON.stringify({ entity: "sales", id: SUPPLIER_ID }),
    }) as never;
    const resBadEntity = await RESTORE_POST(badEntity);
    expect(resBadEntity.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();

    const missing = createMockRequest("http://localhost/api/trash/restore", {
      method: "POST",
      body: JSON.stringify({ entity: "suppliers", id: SUPPLIER_ID }),
    }) as never;
    const resMissing = await RESTORE_POST(missing);
    expect(resMissing.status).toBe(404);
    expect(callsOf("suppliers", "update")).toHaveLength(0);
  });
});
