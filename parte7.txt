import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1, "Nombre del proveedor es requerido").max(200),
  alibaba_url: z.union([z.string().url("URL inválida"), z.literal("")]).optional(),
  contact_name: z.string().max(200).optional().or(z.literal("")),
  contact_email: z.union([z.string().email("Email inválido"), z.literal("")]).optional(),
  contact_whatsapp: z.string().max(20).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  rating: z.coerce.number().int().min(1, "Mínimo 1").max(5, "Máximo 5").nullable().optional(),
  payment_terms: z.string().max(500).optional().or(z.literal("")),
  min_order_qty: z.coerce.number().int().positive("MOQ debe ser mayor a 0").nullable().optional(),
  lead_time_days: z.coerce.number().int().positive("Debe ser mayor a 0").nullable().optional(),
  notes: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;
