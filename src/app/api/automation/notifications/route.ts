import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateNotifications } from "@/lib/notifications";

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

    // Process users in parallel with concurrency limit
    const BATCH_SIZE = 5;
    let totalCreated = 0;
    const critical: { title: string; message: string; product_id: string | null }[] = [];
    const warning: { title: string; message: string; product_id: string | null }[] = [];
    const processedUserIds: string[] = [];

    for (let i = 0; i < allUsers.length; i += BATCH_SIZE) {
      const batch = allUsers.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((user) => generateNotifications(user.id, supabase))
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === "fulfilled") {
          totalCreated += result.value.created;
          processedUserIds.push(batch[j].id);

          for (const n of result.value.notifications) {
            const entry = { title: n.title, message: n.message, product_id: n.product_id || null };
            if (n.priority === "critical") critical.push(entry);
            else if (n.priority === "warning") warning.push(entry);
          }
        }
      }
    }

    // Batch mark as sent_external (single query per user instead of per notification)
    if (processedUserIds.length > 0) {
      const now = new Date().toISOString();
      await supabase
        .from("notifications")
        .update({ sent_external: true })
        .in("user_id", processedUserIds)
        .eq("sent_external", false)
        .lte("created_at", now);
    }

    return NextResponse.json({
      notifications_created: totalCreated,
      critical,
      warning,
    });
  } catch (err) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
