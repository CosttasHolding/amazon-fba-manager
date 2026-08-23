export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";
import { handleMcpRequest } from "@/lib/mcp/server";

import "@/lib/mcp/tools/products";
import "@/lib/mcp/tools/inventory";
import "@/lib/mcp/tools/profitability";
import "@/lib/mcp/tools/dashboard";

export const POST = createApiHandler(async ({ supabase, orgId, user, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const body = await req.json();

  const result = await handleMcpRequest(body, {
    supabase,
    orgId,
    userId: user.id,
  });

  if (result === null) {
    return new NextResponse(null, { status: 202 });
  }

  return NextResponse.json(result);
});
