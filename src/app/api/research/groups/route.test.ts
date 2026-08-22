import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/research/groups/route";
import { PUT, DELETE } from "@/app/api/research/groups/[id]/route";
import { POST as RESTORE_POST } from "@/app/api/research/groups/restore/route";
import { createMockRequest } from "@/lib/test-utils/mock-request";

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
  in: (...args: unknown[]) => MockChain;
  gte: (...args: unknown[]) => MockChain;
  order: (...args: unknown[]) => MockChain;
  range: (...args: unknown[]) => MockChain;
  limit: (...args: unknown[]) => MockChain;
  update: (...args: unknown[]) => MockChain;
  insert: (...args: unknown[]) => MockChain;
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
    in: link("in"),
    gte: link("gte"),
    order: link("order"),
    range: link("range"),
    limit: link("limit"),
    update: link("update"),
    insert: link("insert"),
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

describe("GET /api/research/groups", () => {
  it("devuelve 401 sin autenticación", async () => {
    authFail();
    setupDb();

    const req = createMockRequest("http://localhost/api/research/groups") as never;
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("devuelve grupos activos con sus productos agrupados", async () => {
    authOk();
    setupDb({
      research_groups: {
        data: [
          { id: "group-1", name: "Grupo A" },
          { id: "group-2", name: "Grupo B" },
        ],
        error: null,
      },
      product_research: {
        data: [
          { id: "p1", group_id: "group-1" },
          { id: "p2", group_id: "group-2" },
          { id: "p3", group_id: null },
        ],
        error: null,
      },
    });

    const req = createMockRequest("http://localhost/api/research/groups") as never;
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].products.map((p: { id: string }) => p.id)).toEqual(["p1"]);
    expect(body.data[1].products.map((p: { id: string }) => p.id)).toEqual(["p2"]);

    expect(callsOf("research_groups", "eq")).toContainEqual(
      expect.objectContaining({ args: ["org_id", "org-1"] })
    );
    expect(callsOf("research_groups", "is")).toContainEqual(
      expect.objectContaining({ args: ["deleted_at", null] })
    );
    const ins = callsOf("product_research", "in");
    expect(ins).toHaveLength(1);
    expect(ins[0].args[0]).toBe("group_id");
    expect(ins[0].args[1]).toEqual(["group-1", "group-2"]);
  });
});

describe("POST /api/research/groups", () => {
  it("crea un grupo scoped por organización y devuelve envelope data", async () => {
    authOk();
    setupDb({
      research_groups: {
        data: { id: "group-new", name: "Grupo Nuevo", org_id: "org-1" },
        error: null,
      },
    });

    const req = createMockRequest("http://localhost/api/research/groups", {
      method: "POST",
      body: JSON.stringify({ name: "Grupo Nuevo", niche: "Cocina" }),
    }) as never;
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe("group-new");

    const inserts = callsOf("research_groups", "insert");
    expect(inserts).toHaveLength(1);
    expect(inserts[0].args[0]).toMatchObject({
      name: "Grupo Nuevo",
      niche: "Cocina",
      org_id: "org-1",
    });
  });

  it("rechaza un body inválido con 400 sin insertar", async () => {
    authOk();
    setupDb();

    const req = createMockRequest("http://localhost/api/research/groups", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    }) as never;
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(callsOf("research_groups", "insert")).toHaveLength(0);
  });
});

describe("PUT /api/research/groups/[id]", () => {
  it("actualiza el grupo scoped por organización", async () => {
    authOk();
    setupDb({
      research_groups: { data: { id: "group-1", name: "Nombre Nuevo" }, error: null },
    });

    const req = createMockRequest("http://localhost/api/research/groups/group-1", {
      method: "PUT",
      body: JSON.stringify({ name: "Nombre Nuevo" }),
    }) as never;
    const res = await PUT(req, { params: Promise.resolve({ id: "group-1" }) });
    expect(res.status).toBe(200);

    const updates = callsOf("research_groups", "update");
    expect(updates).toHaveLength(1);
    expect(updates[0].args[0]).toEqual({ name: "Nombre Nuevo" });
    const eqs = callsOf("research_groups", "eq");
    expect(eqs.some((c) => c.args[0] === "id" && c.args[1] === "group-1")).toBe(true);
    expect(eqs.some((c) => c.args[0] === "org_id" && c.args[1] === "org-1")).toBe(true);
  });

  it("devuelve 404 si el grupo no existe", async () => {
    authOk();
    setupDb({ research_groups: { data: null, error: null } });

    const req = createMockRequest("http://localhost/api/research/groups/group-404", {
      method: "PUT",
      body: JSON.stringify({ name: "X" }),
    }) as never;
    const res = await PUT(req, { params: Promise.resolve({ id: "group-404" }) });
    expect(res.status).toBe(404);
    expect(callsOf("research_groups", "update")).toHaveLength(0);
  });
});

describe("DELETE /api/research/groups/[id]", () => {
  it("soft delete marca grupo y productos con deleted_at", async () => {
    authOk();
    setupDb({
      research_groups: { data: [{ id: "group-1" }], error: null },
    });

    const req = createMockRequest("http://localhost/api/research/groups/group-1", {
      method: "DELETE",
    }) as never;
    const res = await DELETE(req, { params: Promise.resolve({ id: "group-1" }) });
    expect(res.status).toBe(200);

    const groupUpdates = callsOf("research_groups", "update");
    expect(groupUpdates).toHaveLength(1);
    expect((groupUpdates[0].args[0] as { deleted_at?: string }).deleted_at).toBeTruthy();

    const productUpdates = callsOf("product_research", "update");
    expect(productUpdates).toHaveLength(1);
    expect((productUpdates[0].args[0] as { deleted_at?: string }).deleted_at).toBeTruthy();

    expect(callsOf("product_research", "eq")).toContainEqual(
      expect.objectContaining({ args: ["group_id", "group-1"] })
    );
    expect(callsOf("product_research", "is")).toContainEqual(
      expect.objectContaining({ args: ["deleted_at", null] })
    );
    expect(callsOf("product_research", "delete")).toHaveLength(0);
    expect(callsOf("research_groups", "delete")).toHaveLength(0);
  });

  it("permanent=true borra productos y grupo en cascada", async () => {
    authOk();
    setupDb({
      research_groups: { data: [{ id: "group-1" }], error: null },
    });

    const req = createMockRequest("http://localhost/api/research/groups/group-1?permanent=true", {
      method: "DELETE",
    }) as never;
    const res = await DELETE(req, { params: Promise.resolve({ id: "group-1" }) });
    expect(res.status).toBe(200);

    expect(callsOf("product_research", "delete")).toHaveLength(1);
    expect(callsOf("product_research", "eq")).toContainEqual(
      expect.objectContaining({ args: ["group_id", "group-1"] })
    );
    expect(callsOf("research_groups", "delete")).toHaveLength(1);
    expect(callsOf("research_groups", "eq")).toContainEqual(
      expect.objectContaining({ args: ["id", "group-1"] })
    );
    expect(callsOf("research_groups", "update")).toHaveLength(0);
    expect(callsOf("product_research", "update")).toHaveLength(0);
  });

  it("devuelve 404 si el grupo no existe", async () => {
    authOk();
    setupDb({ research_groups: { data: null, error: null } });

    const req = createMockRequest("http://localhost/api/research/groups/group-404", {
      method: "DELETE",
    }) as never;
    const res = await DELETE(req, { params: Promise.resolve({ id: "group-404" }) });
    expect(res.status).toBe(404);
    expect(callsOf("product_research", "delete")).toHaveLength(0);
    expect(callsOf("research_groups", "delete")).toHaveLength(0);
  });
});

describe("POST /api/research/groups/restore", () => {
  it("restaura el grupo y solo los productos borrados junto a él", async () => {
    authOk();
    setupDb({
      research_groups: {
        data: {
          id: "group-1",
          name: "Grupo A",
          deleted_at: "2026-08-20T12:00:00.000Z",
        },
        error: null,
      },
    });

    const req = createMockRequest("http://localhost/api/research/groups/restore", {
      method: "POST",
      body: JSON.stringify({ id: "group-1" }),
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
      expect.objectContaining({ args: ["group_id", "group-1"] })
    );
    const gtes = callsOf("product_research", "gte");
    expect(gtes).toHaveLength(1);
    expect(gtes[0].args).toEqual(["deleted_at", "2026-08-20T12:00:00.000Z"]);
  });

  it("no toca productos si el grupo no está en papelera", async () => {
    authOk();
    setupDb({
      research_groups: {
        data: { id: "group-1", name: "Grupo A", deleted_at: null },
        error: null,
      },
    });

    const req = createMockRequest("http://localhost/api/research/groups/restore", {
      method: "POST",
      body: JSON.stringify({ id: "group-1" }),
    }) as never;
    const res = await RESTORE_POST(req);
    expect(res.status).toBe(200);
    expect(callsOf("product_research", "update")).toHaveLength(0);
    expect(callsOf("research_groups", "update")).toHaveLength(1);
  });

  it("devuelve 404 si el grupo no existe", async () => {
    authOk();
    setupDb({ research_groups: { data: null, error: null } });

    const req = createMockRequest("http://localhost/api/research/groups/restore", {
      method: "POST",
      body: JSON.stringify({ id: "group-404" }),
    }) as never;
    const res = await RESTORE_POST(req);
    expect(res.status).toBe(404);
    expect(callsOf("research_groups", "update")).toHaveLength(0);
  });
});
