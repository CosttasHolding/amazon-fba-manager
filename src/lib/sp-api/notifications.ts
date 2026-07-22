import { SpApiClient } from "./client";
import { getSpEndpoint, MARKETPLACE_IDS, type SpApiConnection } from "./types";

export interface WebhookDestination {
  destinationId: string;
  resourceArn: string;
  sqsQueueUrl?: string;
  eventBridgeEndpointArn?: string;
}

export interface WebhookSubscription {
  subscriptionId: string;
  notificationType: string;
  destinationId: string;
  status: string;
}

export const WEBHOOK_NOTIFICATION_TYPES = [
  "ORDER_STATUS_CHANGED",
  "INVENTORY_EVENT",
  "FULFILLMENT_ORDER_STATUS_CHANGED",
  "FEES_INVENTORY_HEALTH_CHANGED",
  "ANY_OFFER_CHANGED",
  "PRICING_HEALTH_CHANGED",
  "PRODUCT_TYPE_CHANGED",
  "REPORT_PROCESSING_FINISHED",
] as const;

export type WebhookNotificationType = (typeof WEBHOOK_NOTIFICATION_TYPES)[number];

export async function createDestination(
  client: SpApiClient,
  applicationId: string,
  destination: { sqsQueueUrl?: string; eventBridgeEndpointArn?: string; httpsEndpoint?: string }
): Promise<WebhookDestination> {
  const endpoint: Record<string, string> = {};
  if (destination.sqsQueueUrl) endpoint.sqsQueueUrl = destination.sqsQueueUrl;
  if (destination.eventBridgeEndpointArn) endpoint.eventBridgeEndpointArn = destination.eventBridgeEndpointArn;
  if (destination.httpsEndpoint) {
    endpoint.httpsEndpoint = destination.httpsEndpoint;
    if (destination.httpsEndpoint) {
      endpoint.authorizationToken = process.env.SP_API_WEBHOOK_SECRET || crypto.randomUUID();
    }
  }

  const result = await client.post<{ destination: { destinationId: string; resourceArn: string; sqsQueueUrl?: string; eventBridgeEndpointArn?: string } }>(
    "/notifications/v1/destinations",
    { resource: { sqsQueueUrl: destination.sqsQueueUrl, eventBridgeEndpointArn: destination.eventBridgeEndpointArn, httpsEndpoint: destination.httpsEndpoint, authorizationToken: endpoint.authorizationToken } }
  );

  return {
    destinationId: result.destination.destinationId,
    resourceArn: result.destination.resourceArn,
    sqsQueueUrl: result.destination.sqsQueueUrl,
    eventBridgeEndpointArn: result.destination.eventBridgeEndpointArn,
  };
}

export async function createSubscription(
  client: SpApiClient,
  notificationType: string,
  destinationId: string
): Promise<WebhookSubscription> {
  const result = await client.post<{ subscriptionId: string }>(
    `/notifications/v1/subscriptions/${encodeURIComponent(notificationType)}`,
    { destinationId }
  );

  return {
    subscriptionId: result.subscriptionId,
    notificationType,
    destinationId,
    status: "active",
  };
}

export async function deleteSubscription(
  client: SpApiClient,
  notificationType: string,
  subscriptionId: string
): Promise<void> {
  await client.delete(`/notifications/v1/subscriptions/${encodeURIComponent(notificationType)}/${subscriptionId}`);
}

export async function getSubscription(
  client: SpApiClient,
  notificationType: string,
  subscriptionId: string
): Promise<{ subscriptionId: string; status: string; destinationId: string }> {
  return client.get(`/notifications/v1/subscriptions/${encodeURIComponent(notificationType)}/${subscriptionId}`);
}

export async function listDestinations(
  client: SpApiClient
): Promise<Array<{ destinationId: string; resourceArn: string }>> {
  const result = await client.get<{ destinations: Array<{ destinationId: string; resourceArn: string }> }>("/notifications/v1/destinations");
  return result.destinations || [];
}

export interface ProcessedNotification {
  type: WebhookNotificationType;
  amazonNotificationId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export function parseNotificationMessage(
  messageBody: string
): ProcessedNotification {
  const parsed = JSON.parse(messageBody) as Record<string, unknown>;

  return {
    type: (parsed.notificationType as string) as WebhookNotificationType,
    amazonNotificationId: (parsed.notificationId as string) || crypto.randomUUID(),
    timestamp: (parsed.timestamp as string) || new Date().toISOString(),
    data: parsed as Record<string, unknown>,
  };
}
