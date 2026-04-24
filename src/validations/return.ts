import { z } from "zod";

export const returnSchema = z.object({
  product_id: z.string().uuid("Seleccion\u00E1 un producto"),
  quantity: z.coerce.number().int().min(1, "La cantidad debe ser mayor a 0"),
  return_reason: z.enum([
    "defective",
    "damaged_by_carrier",
    "customer_damaged",
    "different_from_description",
    "expired_item",
    "fraud",
    "missing_parts",
    "no_longer_wanted",
    "not_as_described",
    "ordered_wrong_item",
    "quality_not_acceptable",
    "arrived_late",
    "undeliverable",
    "unauthorized_purchase",
    "other",
  ]),
  refund_amount: z.coerce.number().min(0, "El reembolso no puede ser negativo").default(0),
  status: z.enum([
    "requested",
    "received_at_customer",
    "in_transit",
    "received_at_fc",
    "inspected",
    "refunded",
    "reimbursed",
    "disposed",
  ]).default("requested"),
  return_date: z.string().min(1, "La fecha es obligatoria"),
});

export type ReturnFormData = z.infer<typeof returnSchema>;
