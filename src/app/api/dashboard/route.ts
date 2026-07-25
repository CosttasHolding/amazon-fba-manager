export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";

export const GET = createApiHandler(async ({ supabase, orgId, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const locale = req.nextUrl.searchParams.get("locale") === "en" ? "en" : "es";
  const data = await getDashboardData(supabase, orgId, locale);
  return NextResponse.json(data);
});
