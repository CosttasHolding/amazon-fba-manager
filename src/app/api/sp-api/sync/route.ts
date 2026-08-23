export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runSync, ensureClient, isTokenExpired } from "@/lib/sp-api/sync-runner";
import type { SyncResult, ConnRow } from "@/lib/sp-api/sync-runner";
import { getOrgId } from "@/lib/org-resolver";
import { hasReimbursementEditorAccess } from "@/lib/reimbursements/access";

const SYNC_TYPES = ["products", "orders", "inventory", "fees", "returns", "payouts", "reimbursements"] as const;

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const { data, error } = await supabase
      .from("sync_logs")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error fetching sync logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { syncType, connectionId } = await req.json();

    if (!SYNC_TYPES.includes(syncType)) {
      return NextResponse.json({ error: "Invalid sync type" }, { status: 400 });
    }

    if (syncType === "reimbursements" && !await hasReimbursementEditorAccess(supabase, user.id, orgId)) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const { data: connection } = await supabase
      .from("sp_api_connections")
      .select("id, org_id, user_id, marketplace, refresh_token, seller_id, access_token, token_expires_at")
      .eq("id", connectionId)
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!connection) {
      return NextResponse.json({ error: "Active connection not found" }, { status: 404 });
    }

    const { data: log, error: logError } = await supabase
      .from("sync_logs")
      .insert({
        user_id: user.id,
        org_id: orgId,
        connection_id: connection.id,
        sync_type: syncType,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) throw logError;

    const result = await runSync(supabase, connection, syncType, user.id, orgId);

    await supabase
      .from("sync_logs")
      .update({
        status: result.success ? "completed" : "failed",
        items_processed: result.processed,
        items_failed: result.failed,
        error_message: result.error || null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", log.id);

    return NextResponse.json({
      success: result.success,
      processed: result.processed,
      failed: result.failed,
      error: result.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
