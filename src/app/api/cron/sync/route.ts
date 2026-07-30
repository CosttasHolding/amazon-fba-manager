import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { refreshAccessToken } from "@/lib/sp-api";
import { runSync, ensureClient, isTokenExpired } from "@/lib/sp-api/sync-runner";
import type { SyncResult, ConnRow } from "@/lib/sp-api/sync-runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    const { data: connections, error: connError } = await supabase
      .from("sp_api_connections")
      .select("id, user_id, marketplace, refresh_token, access_token, token_expires_at, seller_id")
      .eq("status", "active");

    if (connError) throw connError;
    if (!connections?.length) {
      return NextResponse.json({ message: "No active connections", results: [] });
    }

    interface ResultItem extends SyncResult { syncType: string; }
    const results: ResultItem[] = [];
    const syncTypes = ["products", "orders", "inventory", "fees", "returns", "payouts"];

    for (const connection of connections) {
      try {
        if (isTokenExpired(connection.token_expires_at)) {
          const tokens = await refreshAccessToken(connection.refresh_token);
          await supabase
            .from("sp_api_connections")
            .update({
              access_token: tokens.access_token,
              token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            })
            .eq("id", connection.id);
          connection.access_token = tokens.access_token;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("org_id")
          .eq("id", connection.user_id)
          .single();
        const orgId = profile?.org_id || "";

        for (const syncType of syncTypes) {
          const { data: log } = await supabase
            .from("sync_logs")
            .insert({
              user_id: connection.user_id,
              connection_id: connection.id,
              sync_type: syncType,
              status: "running",
              started_at: new Date().toISOString(),
            })
            .select()
            .single();

          let result: SyncResult;
          try {
            result = await runSync(supabase, connection, syncType, connection.user_id, orgId);
          } catch (error) {
            result = {
              success: false,
              processed: 0,
              failed: 0,
              error: error instanceof Error ? error.message : "Sync error",
            };
          }

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

          results.push({ syncType, ...result });
        }
      } catch (error) {
        results.push({
          syncType: "all",
          success: false,
          processed: 0,
          failed: 0,
          error: error instanceof Error ? error.message : "Connection error",
        });
      }
    }

    return NextResponse.json({
      message: `Sync completed for ${connections.length} connection(s)`,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
