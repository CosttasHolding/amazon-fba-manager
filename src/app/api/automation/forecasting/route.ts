import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getForecastSuggestions } from "@/lib/forecasting";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function verifyAuth(req: NextRequest): boolean {
  const automationSecret = req.headers.get("x-automation-secret");
  if (automationSecret && automationSecret === process.env.AUTOMATION_SECRET) return true;

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;

  return false;
}

export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();

    const { data: users } = await supabase.auth.admin.listUsers();
    const allUsers = users?.users || [];

    const results: Record<string, { critical: unknown[]; warning: unknown[] }> = {};

    for (const user of allUsers) {
      const suggestions = await getForecastSuggestions(user.id, supabase);
      const critical = suggestions.filter((s) => s.urgency === "critical");
      const warning = suggestions.filter((s) => s.urgency === "warning");
      if (critical.length > 0 || warning.length > 0) {
        results[user.id] = { critical, warning };
      }
    }

    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
