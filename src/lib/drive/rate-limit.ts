import { NextRequest, NextResponse } from "next/server";
import { buildRateLimitKey, rateLimit } from "@/lib/rate-limit";

function getDriveRateLimitRoute(pathname: string): string {
  return /^\/api\/drive\/connections\/[^/]+$/.test(pathname)
    ? "/api/drive/connections/:id"
    : pathname;
}

export async function enforceDriveRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const result = await rateLimit(
    buildRateLimitKey(ip, getDriveRateLimitRoute(request.nextUrl.pathname)),
    60,
    60000,
  );
  if (result.allowed) return null;

  return NextResponse.json(
    { error: "Demasiadas solicitudes. Intente nuevamente más tarde." },
    { status: 429, headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } },
  );
}
