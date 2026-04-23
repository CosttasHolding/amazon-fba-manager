import { z } from "zod";

export const researchSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(200),
  niche: z.string().max(200).nullable().optional(),
  asin_reference: z.string().max(50).nullable().optional(),
  amazon_category: z.string().max(100).nullable().optional(),
  estimated_monthly_sales: z.coerce.number().int().min(0).nullable().optional(),
  average_price: z.coerce.number().min(0).nullable().optional(),
  review_count_competitor: z.coerce.number().int().min(0).nullable().optional(),
  average_rating: z.coerce.number().min(0).max(5).nullable().optional(),
  bsr: z.coerce.number().int().min(0).nullable().optional(),
  competition_level: z.enum(["low", "medium", "high"]).nullable().optional(),
  estimated_cogs: z.coerce.number().min(0).nullable().optional(),
  estimated_selling_price: z.coerce.number().min(0).nullable().optional(),
  estimated_roi: z.coerce.number().nullable().optional(),
  differentiation_notes: z.string().max(2000).nullable().optional(),
  keywords: z.array(z.string()).nullable().optional(),
  status: z.enum(["idea", "validating", "approved", "rejected", "in_progress", "launched"]).default("idea"),
  priority: z.coerce.number().int().min(1).max(5).default(3),
  source: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
