import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(),
}));

type Row = { data: unknown; error?: unknown };

function stubQuery(result: Row) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    update: () => chain,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    insert: () => Promise.resolve({ data: null, error: null }),
  };
  return chain;
}

function stubSupabaseByTable(tableResults: Record<string, Row>) {
  return {
    from: (table: string) => stubQuery(tableResults[table] ?? { data: null }),
  } as unknown as SupabaseClient;
}

const USER_ID = "11111111-1111-1111-1111-111111111111";

async function importModule() {
  return await import("./org-resolver");
}

describe("getOrgId (H1)", () => {
  let createServiceRoleClientMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const serverModule = await import("@/lib/supabase/server");
    createServiceRoleClientMock = serverModule.createServiceRoleClient as unknown as ReturnType<typeof vi.fn>;
    createServiceRoleClientMock.mockReset();
  });

  it("acepta x-org-id cuando el usuario es miembro activo", async () => {
    const supabase = stubSupabaseByTable({
      org_members: { data: { org_id: "org-propia" } },
    });
    const req = { headers: { get: (n: string) => (n === "x-org-id" ? "org-propia" : null) } };

    const { getOrgId } = await importModule();
    const result = await getOrgId(supabase, USER_ID, req);

    expect(result).toBe("org-propia");
    expect(createServiceRoleClientMock).not.toHaveBeenCalled();
  });

  it("acepta orgId de la URL solo cuando el usuario es miembro activo", async () => {
    const supabase = {
      from: () => {
        let requestedOrgId: string | null = null;
        const query = {
          select: () => query,
          eq: (column: string, value: string) => {
            if (column === "org_id") requestedOrgId = value;
            return query;
          },
          order: () => query,
          limit: () => query,
          maybeSingle: () => Promise.resolve({ data: { org_id: requestedOrgId || "org-otra" } }),
          single: () => Promise.resolve({ data: { org_id: requestedOrgId || "org-otra" } }),
        };
        return query;
      },
    } as unknown as SupabaseClient;
    const req = {
      url: "http://localhost/api/drive/auth?orgId=org-propia",
      headers: { get: () => null },
    };

    const { getOrgId } = await importModule();
    const result = await getOrgId(supabase, USER_ID, req);

    expect(result).toBe("org-propia");
  });

  it("falla cerrado cuando el orgId de la URL no pertenece al usuario", async () => {
    const supabase = {
      from: () => {
        let requestedOrgId: string | null = null;
        const query = {
          select: () => query,
          eq: (column: string, value: string) => {
            if (column === "org_id") requestedOrgId = value;
            return query;
          },
          order: () => query,
          limit: () => query,
          maybeSingle: () => Promise.resolve({ data: requestedOrgId === "org-propia" ? { org_id: requestedOrgId } : null }),
          single: () => Promise.resolve({ data: { org_id: "org-propia" } }),
        };
        return query;
      },
    } as unknown as SupabaseClient;
    const req = {
      url: "http://localhost/api/drive/auth?orgId=org-ajena",
      headers: { get: () => null },
    };

    const { getOrgId } = await importModule();
    await expect(getOrgId(supabase, USER_ID, req)).resolves.toBeNull();
  });

  it("ignora x-org-id ajeno y no auto-provisiona desde el resolver", async () => {
    const supabase = stubSupabaseByTable({
      org_members: { data: null },
    });
    const req = {
      headers: { get: (n: string) => (n === "x-org-id" ? "org-de-victima" : null) },
    };

    const { getOrgId } = await importModule();
    const result = await getOrgId(supabase, USER_ID, req);

    expect(result).not.toBe("org-de-victima");
    expect(result).toBeNull();
    expect(createServiceRoleClientMock).not.toHaveBeenCalled();
  });

  it("sin header resuelve la org por membresía activa", async () => {
    const supabase = stubSupabaseByTable({
      org_members: { data: { org_id: "org-b" } },
    });

    const { getOrgId } = await importModule();
    const result = await getOrgId(supabase, USER_ID);

    expect(result).toBe("org-b");
  });

  it("provisiona solo desde el flujo explícito y usa un slug aleatorio", async () => {
    const admin = {
      rpc: vi.fn().mockResolvedValue({ data: "org-new", error: null }),
    };
    createServiceRoleClientMock.mockReturnValue(admin);

    const { ensureDefaultOrg } = await importModule();
    const result = await ensureDefaultOrg(USER_ID);

    expect(result).toBe("org-new");
    expect(admin.rpc).toHaveBeenCalledWith("ensure_default_org", { target_user_id: USER_ID });
  });
});
