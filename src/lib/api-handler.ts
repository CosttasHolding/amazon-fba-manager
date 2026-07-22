import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit";

type HandlerContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email?: string };
  orgId: string | null;
  req: NextRequest;
};

type ApiHandler = (ctx: HandlerContext) => Promise<NextResponse>;

export function createApiHandler(handler: ApiHandler, rateLimitOpts?: { limit?: number; windowMs?: number }) {
  return async (req: NextRequest) => {
    try {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const route = req.nextUrl.pathname;

      const rl = rateLimit(
        buildRateLimitKey(ip, route),
        rateLimitOpts?.limit ?? 60,
        rateLimitOpts?.windowMs ?? 60000
      );

      if (!rl.allowed) {
        return NextResponse.json(
          { error: "Demasiadas solicitudes. Intente nuevamente más tarde." },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
              "X-RateLimit-Remaining": "0",
            },
          }
        );
      }

      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      let orgId: string | null = req.headers.get("x-org-id") || null;

      if (!orgId) {
        const { data: membership } = await supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("joined_at", { ascending: true })
          .limit(1)
          .single();
        orgId = membership?.org_id || null;
      }

      if (!orgId) {
        const admin = createServiceRoleClient();
        const slug = "org-" + user.id.replace(/-/g, "") + "-default";

        const { data: existing } = await admin
          .from("organizations")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

        if (existing) {
          orgId = existing.id;
        } else {
          const { data: newOrg } = await admin
            .from("organizations")
            .insert({ name: "Mi Organización", slug, owner_id: user.id })
            .select("id")
            .single();
          if (newOrg) {
            await admin
              .from("org_members")
              .insert({ org_id: newOrg.id, user_id: user.id, role: "owner", status: "active" });
            orgId = newOrg.id;
          }
        }
      }

      return await handler({ supabase, user: { id: user.id, email: user.email }, orgId, req });
    } catch (err) {
      console.error("API Error:", err);
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
  };
}

export async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, req: Request): Promise<string | null> {
  let orgId: string | null = req.headers.get("x-org-id") || null;
  if (!orgId) {
    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("joined_at", { ascending: true })
      .limit(1)
      .single();
    orgId = membership?.org_id || null;
  }
  if (!orgId) {
    const admin = createServiceRoleClient();
    const slug = "org-" + userId.replace(/-/g, "") + "-default";
    const { data: existing } = await admin.from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (existing) {
      orgId = existing.id;
    } else {
      const { data: newOrg } = await admin.from("organizations").insert({ name: "Mi Organización", slug, owner_id: userId }).select("id").single();
      if (newOrg) {
        await admin.from("org_members").insert({ org_id: newOrg.id, user_id: userId, role: "owner", status: "active" });
        orgId = newOrg.id;
      }
    }
  }
  return orgId;
}

export function buildPagination(req: NextRequest, defaultPerPage = 20) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const perPage = Math.min(200, Math.max(1, parseInt(searchParams.get("perPage") || String(defaultPerPage), 10) || defaultPerPage));
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  return { page, perPage, from, to };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

export function paginatedResponse<T>(data: T[], total: number, page: number, perPage: number): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    },
  };
}

