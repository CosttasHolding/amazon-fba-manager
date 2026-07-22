import { z } from "zod";

export const reimbursementSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  return_id: z.string().uuid().nullable().optional(),
  amazon_case_id: z.string().max(100).nullable().optional(),
  reimbursement_type: z.enum(["lost_inbound","damaged_inbound","lost_warehouse","damaged_warehouse","customer_return","removal_order","other"]),
  quantity: z.coerce.number().int().positive("Cantidad requerida"),
  amount: z.coerce.number().positive("Monto requerido"),
  currency: z.string().max(3).default("USD"),
  status: z.enum(["pending","submitted","approved","rejected","paid"]).default("pending"),
  issue_date: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
