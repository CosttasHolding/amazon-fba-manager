export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  createDestination,
  createSubscription,
  deleteSubscription,
  WEBHOOK_NOTIFICATION_TYPES,
  type WebhookNotificationType,
} from "@/lib/sp-api/notifications";
import { SpApiClient } from "@/lib/sp-api/client";
import { getSpEndpoint } from "@/lib/sp-api/types";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  const orgId = profile?.org_id;
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const body = await request.json();
  const { connectionId, notificationTypes } = body as {
    connectionId: string;
    notificationTypes?: WebhookNotificationType[];
  };

  if (!connectionId) {
    return NextResponse.json({ error: "connectionId required" }, { status: 400 });
  }

  const { data: connection } = await supabase
    .from("sp_api_connections")
    .select("id, user_id, marketplace, access_token, refresh_token, status")
    .eq("id", connectionId)
    .eq("org_id", orgId)
    .eq("status", "active")
    .single();

  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const client = new SpApiClient({
    accessToken: connection.access_token || "",
    refreshToken: connection.refresh_token || "",
    marketplace: connection.marketplace,
    sellerId: "",
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const webhookUrl = `${appUrl}/api/sp-api/webhooks`;
  const typesToSubscribe = notificationTypes || [...WEBHOOK_NOTIFICATION_TYPES] as unknown as WebhookNotificationType[];

  const serviceClient = createServiceRoleClient();

  const { data: existingSub } = await serviceClient
    .from("sp_api_webhook_subscriptions")
    .select("amazon_destination_id")
    .eq("connection_id", connectionId)
    .not("amazon_destination_id", "is", null)
    .limit(1)
    .single();

  let destinationId = existingSub?.amazon_destination_id;

  if (!destinationId) {
    try {
      const dest = await createDestination(client, process.env.SP_API_CLIENT_ID || "", {
        httpsEndpoint: webhookUrl,
      });
      destinationId = dest.destinationId;
    } catch (err) {
      return NextResponse.json(
        { error: `Failed to create destination: ${err instanceof Error ? err.message : "Unknown error"}` },
        { status: 500 }
      );
    }
  }

  const results: Array<{ type: string; status: string; subscriptionId?: string; error?: string }> = [];

  for (const notifType of typesToSubscribe) {
    try {
      const { data: existing } = await serviceClient
        .from("sp_api_webhook_subscriptions")
        .select("id, amazon_subscription_id, status")
        .eq("connection_id", connectionId)
        .eq("notification_type", notifType)
        .single();

      if (existing && existing.status === "active") {
        results.push({ type: notifType, status: "already_active", subscriptionId: existing.amazon_subscription_id || undefined });
        continue;
      }

      const sub = await createSubscription(client, notifType, destinationId);

      const upsertData: Record<string, unknown> = {
        user_id: user.id,
        org_id: orgId,
        connection_id: connectionId,
        notification_type: notifType,
        amazon_destination_id: destinationId,
        amazon_subscription_id: sub.subscriptionId,
        status: "active",
        error_message: null,
      };

      if (existing) {
        await serviceClient
          .from("sp_api_webhook_subscriptions")
          .update(upsertData)
          .eq("id", existing.id);
      } else {
        await serviceClient
          .from("sp_api_webhook_subscriptions")
          .insert(upsertData);
      }

      results.push({ type: notifType, status: "active", subscriptionId: sub.subscriptionId });
    } catch (err) {
      results.push({ type: notifType, status: "error", error: err instanceof Error ? err.message : "Unknown error" });

      await serviceClient
        .from("sp_api_webhook_subscriptions")
        .upsert({
          user_id: user.id,
          org_id: orgId,
          connection_id: connectionId,
          notification_type: notifType,
          status: "error",
          error_message: err instanceof Error ? err.message : "Unknown error",
        }, { onConflict: "connection_id,notification_type" });
    }
  }

  return NextResponse.json({ destinationId, subscriptions: results });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  const orgId = profile?.org_id;
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const url = new URL(request.url);
  const subscriptionId = url.searchParams.get("subscriptionId");
  const notificationType = url.searchParams.get("notificationType");

  if (!subscriptionId || !notificationType) {
    return NextResponse.json({ error: "subscriptionId and notificationType required" }, { status: 400 });
  }

  const { data: sub } = await supabase
    .from("sp_api_webhook_subscriptions")
    .select("id, connection_id, amazon_subscription_id, status")
    .eq("id", subscriptionId)
    .eq("org_id", orgId)
    .single();

  if (!sub) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  const { data: connection } = await supabase
    .from("sp_api_connections")
    .select("marketplace, access_token, refresh_token")
    .eq("id", sub.connection_id)
    .single();

  if (connection && sub.amazon_subscription_id) {
    try {
      const client = new SpApiClient({
        accessToken: connection.access_token || "",
        refreshToken: connection.refresh_token || "",
        marketplace: connection.marketplace,
        sellerId: "",
      });
      await deleteSubscription(client, notificationType, sub.amazon_subscription_id);
    } catch {
      // Continue even if Amazon API fails
    }
  }

  await supabase
    .from("sp_api_webhook_subscriptions")
    .update({ status: "paused" })
    .eq("id", subscriptionId);

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  const orgId = profile?.org_id;
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const { data: subscriptions, error } = await supabase
    .from("sp_api_webhook_subscriptions")
    .select("*, sp_api_connections!inner(marketplace, seller_id)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }

  return NextResponse.json({ data: subscriptions || [] });
}
