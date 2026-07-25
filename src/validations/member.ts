import { z } from "zod";

export const memberSchema = z.object({
  full_name: z.string().min(1, "Nombre requerido").max(255),
  email: z.string().email().optional().nullable(),
  ownership_pct: z.coerce.number().min(0).max(100).default(0),
  status: z.enum(["active", "deceased", "retired"]).default("active"),
  role: z.enum(["admin", "editor", "viewer"]).default("editor"),
  executor_name: z.string().max(255).optional().nullable(),
  executor_email: z.string().email().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const taskSchema = z.object({
  title: z.string().min(1, "Título requerido").max(255),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(["pending", "in_progress", "completed"]).default("pending"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  module: z.string().max(100).optional().nullable(),
  related_to: z.any().optional().nullable(),
});

export const boardDecisionSchema = z.object({
  title: z.string().min(1, "Título requerido").max(255),
  doc_reference: z.string().max(100).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  decision_date: z.string().optional().nullable(),
  voted_by: z.record(z.unknown()).optional().nullable(),
  status: z.enum(["draft", "approved", "rejected", "executed"]).default("draft"),
  file_url: z.string().max(500).optional().nullable(),
});
