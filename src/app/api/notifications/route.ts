export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateNotifications } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notifications } = await generateNotifications(user.id, supabase);

    // Read dismissed notification IDs from query param (client-side state)
    const dismissedParam = req.nextUrl.searchParams.get("dismissed");
    const dismissedIds = dismissedParam ? dismissedParam.split(",") : [];

    const filtered = notifications.map((n) => ({
      ...n,
      read: dismissedIds.includes(n.id),
    }));

    const unreadCount = filtered.filter((n) => !n.read).length;

    return NextResponse.json({
      notifications: filtered,
      unread_count: unreadCount,
      total_count: filtered.length,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
