import { z } from "zod";
import { MARKETPLACE_VALUES, PRODUCT_CATEGORIES, PRODUCT_STATUS_VALUES } from "@/lib/constants";

export const dutyRateSchema = z.preprocess(
  (value) => (value === null || value === undefined ? 0 : value),
  z.coerce.number().min(0).max(1)
);

export const productSchema = z.object({
  sku: z.string().max(100).optional().nullable(),
  asin: z.string().max(100).optional().nullable(),
  name: z.string().min(1, "Name is required").max(255),
  category: z
    .enum(PRODUCT_CATEGORIES)
    .optional()
    .nullable(),
  status: z.enum(PRODUCT_STATUS_VALUES).default("active"),
  marketplace: z
    .enum(MARKETPLACE_VALUES)
    .optional()
    .default("US"),
  unitCost: z.coerce.number().min(0).default(0),
  salePrice: z.coerce.number().min(0).default(0),
  fbaFee: z.coerce.number().min(0).default(0),
  referralFee: z.coerce.number().min(0).default(0),
  shippingCost: z.coerce.number().min(0).default(0),
  storageFeeMonthly: z.coerce.number().min(0).optional().default(0),
  prepCost: z.coerce.number().min(0).optional().default(0),
  taxes: z.coerce.number().min(0).optional().default(0),
  otherFees: z.coerce.number().min(0).optional().default(0),
  dutyRate: dutyRateSchema,
  weightKg: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});
