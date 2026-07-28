import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit";
import { getOrgId, resolveOrgId } from "@/lib/org-resolver";

export { getOrgId };

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

      const rl = await rateLimit(
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
        orgId = await resolveOrgId(supabase, user.id);
      }

      return await handler({ supabase, user: { id: user.id, email: user.email }, orgId, req });
    } catch (err) {
      console.error("API Error:", err);
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
  };
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

