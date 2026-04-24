import { z } from "zod";

export const expenseSchema = z.object({
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
  description: z.string().min(1, "La descripci\u00F3n es obligatoria").max(500, "M\u00E1ximo 500 caracteres"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  expense_date: z.string().min(1, "La fecha es obligatoria"),
  vendor: z.string().max(200).optional().or(z.literal("")),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
