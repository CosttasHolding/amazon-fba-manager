import { describe, it, expect } from "vitest";
import {
  parseNotificationMessage,
  WEBHOOK_NOTIFICATION_TYPES,
} from "./notifications";

describe("SP-API Notifications", () => {
  describe("WEBHOOK_NOTIFICATION_TYPES", () => {
    it("contiene los 8 tipos de notificacion", () => {
      expect(WEBHOOK_NOTIFICATION_TYPES).toHaveLength(8);
    });

    it("incluye ORDER_STATUS_CHANGED", () => {
      expect(WEBHOOK_NOTIFICATION_TYPES).toContain("ORDER_STATUS_CHANGED");
    });

    it("incluye INVENTORY_EVENT", () => {
      expect(WEBHOOK_NOTIFICATION_TYPES).toContain("INVENTORY_EVENT");
    });

    it("incluye REPORT_PROCESSING_FINISHED", () => {
      expect(WEBHOOK_NOTIFICATION_TYPES).toContain("REPORT_PROCESSING_FINISHED");
    });
  });

  describe("parseNotificationMessage", () => {
    it("parsea un mensaje de ORDER_STATUS_CHANGED", () => {
      const message = JSON.stringify({
        notificationType: "ORDER_STATUS_CHANGED",
        notificationId: "notif-123",
        timestamp: "2026-07-15T10:00:00Z",
        orderId: "111-2223334-4445556",
      });

      const result = parseNotificationMessage(message);

      expect(result.type).toBe("ORDER_STATUS_CHANGED");
      expect(result.amazonNotificationId).toBe("notif-123");
      expect(result.timestamp).toBe("2026-07-15T10:00:00Z");
      expect(result.data.orderId).toBe("111-2223334-4445556");
    });

    it("usa notificationId por defecto si falta", () => {
      const message = JSON.stringify({
        notificationType: "INVENTORY_EVENT",
        timestamp: "2026-07-15T10:00:00Z",
      });

      const result = parseNotificationMessage(message);

      expect(result.type).toBe("INVENTORY_EVENT");
      expect(result.amazonNotificationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it("usa timestamp actual si falta", () => {
      const before = Date.now();
      const message = JSON.stringify({
        notificationType: "FEES_INVENTORY_HEALTH_CHANGED",
      });

      const result = parseNotificationMessage(message);

      expect(result.type).toBe("FEES_INVENTORY_HEALTH_CHANGED");
      const parsedTime = new Date(result.timestamp).getTime();
      expect(parsedTime).toBeGreaterThanOrEqual(before - 1000);
      expect(parsedTime).toBeLessThanOrEqual(Date.now() + 1000);
    });

    it("lanza error con JSON invalido", () => {
      expect(() => parseNotificationMessage("not json")).toThrow();
    });

    it("preserva todo el payload en data", () => {
      const payload = {
        notificationType: "FULFILLMENT_ORDER_STATUS_CHANGED",
        notificationId: "n-456",
        timestamp: "2026-07-15T10:00:00Z",
        orderId: "111-2223334-4445556",
        status: "SHIPPED",
        marketplaceId: "ATVPDKIKX0DER",
      };

      const result = parseNotificationMessage(JSON.stringify(payload));

      expect(result.data.orderId).toBe("111-2223334-4445556");
      expect(result.data.status).toBe("SHIPPED");
      expect(result.data.marketplaceId).toBe("ATVPDKIKX0DER");
    });
  });
});
