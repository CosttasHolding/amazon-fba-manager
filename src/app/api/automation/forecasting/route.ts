import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getForecastSuggestions } from "@/lib/forecasting";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function verifyAuth(req: NextRequest): boolean {
  const automationSecret = req.headers.get("x-automation-secret");
  const expectedAutomationSecret = process.env.AUTOMATION_SECRET;
  if (expectedAutomationSecret && automationSecret === expectedAutomationSecret) return true;

  const authHeader = req.headers.get("authorization");
  const expectedCronSecret = process.env.CRON_SECRET;
  if (expectedCronSecret && authHeader === `Bearer ${expectedCronSecret}`) return true;

  return false;
}

export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = req.headers.get("x-org-id");
  if (!orgId || !z.string().uuid().safeParse(orgId).success) {
    return NextResponse.json({ error: "x-org-id inválido" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();

    let criticalCount = 0;
    let warningCount = 0;
    const { data: memberships, error: membershipsError } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("status", "active");

    if (membershipsError) throw membershipsError;

    for (const membership of memberships || []) {
      const suggestions = await getForecastSuggestions(membership.user_id, orgId, supabase);
      criticalCount += suggestions.filter((s) => s.urgency === "critical").length;
      warningCount += suggestions.filter((s) => s.urgency === "warning").length;
    }

    return NextResponse.json({ org_id: orgId, criticalCount, warningCount });
  } catch (err) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
