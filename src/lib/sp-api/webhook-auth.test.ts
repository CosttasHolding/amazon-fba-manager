import { describe, expect, it } from "vitest";
import {
  extractAmazonSubscriptionId,
  isAuthorizedWebhook,
} from "./webhook-auth";

const SECRET = "secreto-webhook-123";

describe("isAuthorizedWebhook (C3)", () => {
  it("acepta el bearer correcto", () => {
    expect(isAuthorizedWebhook(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("rechaza secret incorrecto", () => {
    expect(isAuthorizedWebhook("Bearer otro-secreto", SECRET)).toBe(false);
  });

  it("rechaza header ausente", () => {
    expect(isAuthorizedWebhook(null, SECRET)).toBe(false);
  });

  it("rechaza header sin prefijo Bearer", () => {
    expect(isAuthorizedWebhook(SECRET, SECRET)).toBe(false);
  });
});

describe("extractAmazonSubscriptionId (C3)", () => {
  it("extrae subscriptionId de notificationMetadata", () => {
    const data = {
      notificationMetadata: { subscriptionId: "amzn-sub-42" },
    };
    expect(extractAmazonSubscriptionId(data)).toBe("amzn-sub-42");
  });

  it("devuelve null si no hay metadata", () => {
    expect(extractAmazonSubscriptionId({})).toBeNull();
  });

  it("devuelve null si subscriptionId no es string", () => {
    expect(
      extractAmazonSubscriptionId({
        notificationMetadata: { subscriptionId: 42 },
      })
    ).toBeNull();
  });
});
