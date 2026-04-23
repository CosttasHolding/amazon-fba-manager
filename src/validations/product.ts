import { z } from "zod";

export const productSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(100),
  asin: z.string().max(100).optional().nullable(),
  name: z.string().min(1, "Name is required").max(255),
  category: z
    .enum([
      "Electronics",
      "Toys",
      "Home",
      "Kitchen",
      "Health",
      "Beauty",
      "Sports",
      "Books",
      "Other",
    ])
    .optional()
    .nullable(),
  status: z.enum(["active", "paused", "discontinued"]).default("active"),
  marketplace: z
    .enum(["US", "MX", "CA", "UK", "DE", "FR", "IT", "ES"])
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
  weightKg: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});