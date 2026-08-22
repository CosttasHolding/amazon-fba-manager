import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/research/[id]/group/route";
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/research/[id]/group", () => {
  it("mueve el producto al grupo válido y devuelve envelope data", async () => {
    authOk();
    setupDb({
      research_groups: { data: { id: "group-2" }, error: null },
      product_research: { data: { id: "p1", group_id: "group-2" }, error: null },
    });

    const req = createMockRequest("http://localhost/api/research/p1/group", {
      method: "POST",
      body: JSON.stringify({ group_id: "group-2" }),
    }) as never;
    const res = await POST(req, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("p1");
    expect(body.data.group_id).toBe("group-2");

    const groupEqs = callsOf("research_groups", "eq");
    expect(groupEqs.some((c) => c.args[0] === "id" && c.args[1] === "group-2")).toBe(true);
    expect(groupEqs.some((c) => c.args[0] === "org_id" && c.args[1] === "org-1")).toBe(true);
    expect(callsOf("research_groups", "is")).toContainEqual(
      expect.objectContaining({ args: ["deleted_at", null] })
    );

    const updates = callsOf("product_research", "update");
    expect(updates).toHaveLength(1);
    expect(updates[0].args[0]).toEqual({ group_id: "group-2" });
    const eqs = callsOf("product_research", "eq");
    expect(eqs.some((c) => c.args[0] === "id" && c.args[1] === "p1")).toBe(true);
    expect(eqs.some((c) => c.args[0] === "org_id" && c.args[1] === "org-1")).toBe(true);
  });

  it("saca el producto del grupo cuando group_id es null", async () => {
    authOk();
    setupDb({
      product_research: { data: { id: "p1", group_id: null }, error: null },
    });

    const req = createMockRequest("http://localhost/api/research/p1/group", {
      method: "POST",
      body: JSON.stringify({ group_id: null }),
    }) as never;
    const res = await POST(req, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.group_id).toBeNull();

    expect(callsOf("research_groups", "select")).toHaveLength(0);
    const updates = callsOf("product_research", "update");
    expect(updates).toHaveLength(1);
    expect(updates[0].args[0]).toEqual({ group_id: null });
  });

  it("devuelve 404 si el producto no existe en la organización", async () => {
    authOk();
    setupDb({
      research_groups: { data: { id: "group-2" }, error: null },
      product_research: { data: null, error: null },
    });

    const req = createMockRequest("http://localhost/api/research/p-404/group", {
      method: "POST",
      body: JSON.stringify({ group_id: "group-2" }),
    }) as never;
    const res = await POST(req, { params: Promise.resolve({ id: "p-404" }) });
    expect(res.status).toBe(404);
  });

  it("devuelve 404 si el grupo no existe o pertenece a otra organización", async () => {
    authOk();
    setupDb({ research_groups: { data: null, error: null } });

    const req = createMockRequest("http://localhost/api/research/p1/group", {
      method: "POST",
      body: JSON.stringify({ group_id: "group-ajeno" }),
    }) as never;
    const res = await POST(req, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(404);
    expect(callsOf("product_research", "update")).toHaveLength(0);
  });
});
