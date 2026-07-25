import { z } from "zod";

export const saleSchema = z.object({
  product_id: z.string().uuid(),
  sale_date: z.string().min(1),
  units_sold: z.coerce.number().int().min(1),
  revenue: z.coerce.number().min(0),
  amazon_fees: z.coerce.number().min(0).default(0),
  order_id: z.string().max(255).nullable().optional(),
});
