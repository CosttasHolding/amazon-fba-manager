import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateNotifications } from "@/lib/notifications";

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

  try {
    const supabase = createServiceRoleClient();

    const { data: memberships, error: membershipsError } = await supabase
      .from("org_members")
      .select("user_id, org_id")
      .eq("status", "active");

    if (membershipsError) throw membershipsError;
    const activeMemberships = (memberships || []).filter(
      (membership): membership is { user_id: string; org_id: string } =>
        Boolean(membership.user_id && membership.org_id)
    );

    const BATCH_SIZE = 5;
    let totalCreated = 0;
    const processedMemberships: { user_id: string; org_id: string }[] = [];

    for (let i = 0; i < activeMemberships.length; i += BATCH_SIZE) {
      const batch = activeMemberships.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((membership) =>
          generateNotifications(membership.user_id, membership.org_id, supabase)
        )
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === "fulfilled") {
          totalCreated += result.value.created;
          processedMemberships.push(batch[j]);
        }
      }
    }

    const now = new Date().toISOString();
    await Promise.all(
      processedMemberships.map((membership) =>
        supabase
          .from("notifications")
          .update({ sent_external: true })
          .eq("user_id", membership.user_id)
          .eq("org_id", membership.org_id)
          .eq("sent_external", false)
          .lte("created_at", now)
      )
    );

    return NextResponse.json({
      notifications_created: totalCreated,
      memberships_processed: processedMemberships.length,
    });
  } catch (err) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
