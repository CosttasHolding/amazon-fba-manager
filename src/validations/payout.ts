import { z } from "zod";

export const payoutSchema = z.object({
  payout_period_start: z.string().min(1, "Fecha inicio requerida"),
  payout_period_end: z.string().min(1, "Fecha fin requerida"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  currency: z.string().max(3).default("USD"),
  status: z.enum(["pending","transferred","failed"]).default("pending"),
  amazon_reference: z.string().max(200).nullable().optional(),
  bank_account_last4: z.string().max(4).nullable().optional(),
  transfer_date: z.string().nullable().optional(),
  marketplace: z.string().max(10).default("US"),
  notes: z.string().max(2000).nullable().optional(),
});
