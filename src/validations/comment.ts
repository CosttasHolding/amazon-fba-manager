import { z } from "zod";

const commentEntityEnum = z.enum([
  "product",
  "order",
  "supplier",
  "member",
  "sale",
  "inventory",
]);

export const commentSchema = z.object({
  entity: commentEntityEnum,
  entity_id: z.string().uuid("entity_id debe ser un UUID válido"),
  content: z.string().min(1, "Contenido requerido").max(5000),
  parent_id: z.string().uuid().optional().nullable(),
});

export const commentQuerySchema = z.object({
  entity: commentEntityEnum,
  entity_id: z.string().uuid(),
});
