import { z } from "zod";

export const expenseSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  category: z.enum([
    "ppc",
    "software",
    "va_services",
    "samples",
    "photography",
    "shipping_forwarder",
    "customs",
    "prep_center",
    "storage_3pl",
    "travel",
    "other",
  ]),
  subcategory: z.string().max(100).nullable().optional(),
  description: z.string().min(1, "La descripción es obligatoria").max(500, "Máximo 500 caracteres"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  currency: z.string().max(3).default("USD"),
  exchange_rate: z.coerce.number().positive().default(1),
  expense_date: z.string().nullable().optional(),
  recurring: z.coerce.boolean().default(false),
  recurring_frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]).nullable().optional(),
  vendor: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
