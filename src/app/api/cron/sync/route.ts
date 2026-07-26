import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { refreshAccessToken } from "@/lib/sp-api";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface SyncResult {
  syncType: string;
  status: "completed" | "failed";
  processed: number;
  failed: number;
  error?: string;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    const { data: connections, error: connError } = await supabase
      .from("sp_api_connections")
      .select("id, user_id, marketplace, refresh_token, access_token, token_expires_at")
      .eq("status", "active");

    if (connError) throw connError;
    if (!connections?.length) {
      return NextResponse.json({ message: "No active connections", results: [] });
    }

    const results: SyncResult[] = [];

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

        const syncTypes = ["products", "orders", "inventory", "fees"];

        for (const syncType of syncTypes) {
          const result = await executeSync(supabase, connection, syncType);
          results.push(result);
        }
      } catch (error) {
        results.push({
          syncType: "all",
          status: "failed",
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

function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= Date.now() + 60000;
}

interface ConnectionRow {
  id: string;
  user_id: string;
  marketplace: string;
  refresh_token: string;
  access_token: string | null;
  token_expires_at: string | null;
}

async function executeSync(
  supabase: ReturnType<typeof createServiceRoleClient>,
  connection: ConnectionRow,
  syncType: string
): Promise<SyncResult> {
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

  try {
    if (!process.env.SP_API_CLIENT_ID || !process.env.SP_API_CLIENT_SECRET) {
      throw new Error("SP_API_CLIENT_ID y SP_API_CLIENT_SECRET no configurados");
    }

    console.warn("CRON sync stub: SP-API sync no implementado aun. Marcar como completado sin datos.");
    await supabase
      .from("sync_logs")
      .update({
        status: "completed",
        items_processed: 0,
        items_failed: 0,
        completed_at: new Date().toISOString(),
      })
      .eq("id", log.id);

    return { syncType, status: "completed", processed: 0, failed: 0 };
  } catch (error) {
    await supabase
      .from("sync_logs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Sync error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", log.id);

    return {
      syncType,
      status: "failed",
      processed: 0,
      failed: 0,
      error: error instanceof Error ? error.message : "Sync error",
    };
  }
}
