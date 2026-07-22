import { z } from "zod";

const auditActionEnum = z.enum([
  "create",
  "update",
  "delete",
  "view",
  "export",
  "import",
]);

const auditEntityEnum = z.enum([
  "product",
  "order",
  "supplier",
  "sale",
  "inventory",
  "member",
  "settings",
  "campaign",
  "expense",
  "return",
  "shipment",
  "research",
]);

export const auditLogSchema = z.object({
  entity: auditEntityEnum,
  entity_id: z.string().uuid("entity_id debe ser un UUID válido"),
  action: auditActionEnum,
  changes: z.record(z.unknown()).optional().default({}),
});

export const auditLogQuerySchema = z.object({
  entity: auditEntityEnum.optional(),
  action: auditActionEnum.optional(),
});
