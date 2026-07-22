import { z } from "zod";

export const settingsUpdateSchema = z
  .object({
    full_name: z.string().max(255).optional(),
    company: z.string().max(255).optional(),
    country: z.string().max(100).optional(),
    marketplace: z.string().max(50).optional(),
    default_fba_fee: z.coerce.number().min(0).optional(),
    default_referral_fee: z.coerce.number().min(0).max(100).optional(),
    default_shipping_cost: z.coerce.number().min(0).optional(),
    default_storage_cost: z.coerce.number().min(0).optional(),
    target_roi: z.coerce.number().min(0).max(10000).optional(),
    currency: z.string().max(10).optional(),
    tax_rate: z.coerce.number().min(0).max(100).optional(),
    language: z.enum(["es", "en", "ar"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay campos para actualizar",
  });
