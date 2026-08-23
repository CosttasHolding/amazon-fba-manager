import { timingSafeEqual } from "crypto";

export function isAuthorizedWebhook(
  authHeader: string | null,
  secret: string
): boolean {
  const expected = `Bearer ${secret}`;
  const received = Buffer.from(authHeader ?? "", "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (received.length !== expectedBuf.length) return false;
  return timingSafeEqual(received, expectedBuf);
}

export function extractAmazonSubscriptionId(
  data: Record<string, unknown>
): string | null {
  const meta = data.notificationMetadata as
    | { subscriptionId?: unknown }
    | undefined;
  if (!meta || typeof meta.subscriptionId !== "string") return null;
  return meta.subscriptionId;
}
