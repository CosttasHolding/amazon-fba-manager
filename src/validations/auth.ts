import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .max(16, "Máximo 16 caracteres")
    .regex(/[A-Z]/, "Debe tener una mayúscula")
    .regex(/[a-z]/, "Debe tener una minúscula")
    .regex(/[0-9]/, "Debe tener un número"),
  fullName: z.string().min(1, "Nombre requerido"),
});

export const resetSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const updatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .max(16, "Máximo 16 caracteres")
    .regex(/[A-Z]/, "Debe tener una mayúscula")
    .regex(/[a-z]/, "Debe tener una minúscula")
    .regex(/[0-9]/, "Debe tener un número"),
});
