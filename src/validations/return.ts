import { z } from "zod";

export const returnSchema = z.object({
  product_id: z.string().uuid("Seleccioná un producto"),
  order_id: z.string().max(100).nullable().optional(),
  amazon_return_id: z.string().max(100).nullable().optional(),
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
  customer_comment: z.string().max(1000).nullable().optional(),
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
  disposition: z.enum(["sellable", "unsellable", "pending"]).nullable().optional(),
  return_date: z.string().min(1, "La fecha es obligatoria"),
  notes: z.string().max(2000).nullable().optional(),
});

export type ReturnFormData = z.infer<typeof returnSchema>;
