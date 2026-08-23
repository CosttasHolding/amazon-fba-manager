export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { parseNotificationMessage, type WebhookNotificationType } from "@/lib/sp-api/notifications";
import {
  extractAmazonSubscriptionId,
  isAuthorizedWebhook,
} from "@/lib/sp-api/webhook-auth";

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.SP_API_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Webhook no configurado" },
        { status: 503 }
      );
    }
    const authHeader = request.headers.get("authorization");
    if (!isAuthorizedWebhook(authHeader, webhookSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.text();
    const notification = parseNotificationMessage(body);

    const supabase = createServiceRoleClient();

    const amazonSubscriptionId = extractAmazonSubscriptionId(notification.data);

    let subscription: {
      id: string;
      user_id: string;
      org_id: string;
      connection_id: string;
    } | null = null;

    if (amazonSubscriptionId) {
      const { data } = await supabase
        .from("sp_api_webhook_subscriptions")
        .select("id, user_id, org_id, connection_id")
        .eq("notification_type", notification.type)
        .eq("status", "active")
        .eq("amazon_subscription_id", amazonSubscriptionId)
        .maybeSingle();
      subscription = data ?? null;
    }

    if (!subscription) {
      await supabase.from("sp_api_webhook_logs").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        org_id: "00000000-0000-0000-0000-000000000000",
        notification_type: notification.type,
        amazon_notification_id: notification.amazonNotificationId,
        payload: notification.data,
        status: "received",
      });
      return NextResponse.json({ received: true });
    }

    const startTime = Date.now();
    const { data: logEntry } = await supabase
      .from("sp_api_webhook_logs")
      .insert({
        user_id: subscription.user_id,
        org_id: subscription.org_id,
        connection_id: subscription.connection_id,
        subscription_id: subscription.id,
        notification_type: notification.type,
        amazon_notification_id: notification.amazonNotificationId,
        payload: notification.data,
        status: "processing",
      })
      .select("id")
      .single();

    let processError: string | null = null;

    try {
      await processNotification(supabase, subscription.user_id, subscription.org_id, notification);
    } catch (err) {
      processError = err instanceof Error ? err.message : "Unknown processing error";
    }

    const processingTime = Date.now() - startTime;

    if (logEntry) {
      await supabase
        .from("sp_api_webhook_logs")
        .update({
          status: processError ? "failed" : "processed",
          error_message: processError,
          processing_time_ms: processingTime,
        })
        .eq("id", logEntry.id);
    }

    await supabase
      .from("sp_api_webhook_subscriptions")
      .update({ last_received_at: new Date().toISOString() })
      .eq("id", subscription.id);

    if (processError) {
      return NextResponse.json({ received: true, processed: false, error: processError }, { status: 200 });
    }

    return NextResponse.json({ received: true, processed: true });
  } catch {
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  const orgId = profile?.org_id;
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);

  const { data: logs, error } = await supabase
    .from("sp_api_webhook_logs")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }

  return NextResponse.json({ data: logs || [] });
}

async function processNotification(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  orgId: string,
  notification: { type: WebhookNotificationType; data: Record<string, unknown> }
) {
  const payload = notification.data as Record<string, unknown>;

  switch (notification.type) {
    case "ORDER_STATUS_CHANGED": {
      const orderId = (payload as Record<string, unknown>).orderId || (payload as Record<string, unknown>).amazon_order_id;
      await supabase.from("notifications").insert({
        user_id: userId,
        org_id: orgId,
        type: "system",
        title: "Order Status Changed",
        message: `Order ${orderId || "unknown"} status has changed. Trigger sync to update.`,
        metadata: { order_id: orderId, source: "sp_api_webhook" },
      });
      break;
    }
    case "INVENTORY_EVENT": {
      await supabase.from("notifications").insert({
        user_id: userId,
        org_id: orgId,
        type: "system",
        title: "Inventory Updated",
        message: "Inventory levels changed on Amazon. Trigger sync to update.",
        metadata: { source: "sp_api_webhook" },
      });
      break;
    }
    case "FULFILLMENT_ORDER_STATUS_CHANGED": {
      await supabase.from("notifications").insert({
        user_id: userId,
        org_id: orgId,
        type: "system",
        title: "Fulfillment Status Changed",
        message: "FBA shipment status has changed.",
        metadata: { source: "sp_api_webhook" },
      });
      break;
    }
    case "FEES_INVENTORY_HEALTH_CHANGED": {
      await supabase.from("notifications").insert({
        user_id: userId,
        org_id: orgId,
        type: "low_margin",
        title: "Fees Changed",
        message: "FBA fees or inventory health has changed. Review pricing.",
        metadata: { source: "sp_api_webhook" },
      });
      break;
    }
    default: {
      await supabase.from("notifications").insert({
        user_id: userId,
        org_id: orgId,
        type: "system",
        title: `SP-API: ${notification.type}`,
        message: `Received ${notification.type} notification from Amazon.`,
        metadata: { source: "sp_api_webhook" },
      });
      break;
    }
  }
}
