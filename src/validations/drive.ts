import { z } from "zod";

export const driveNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value));

export const driveContentSchema = z.string().max(1_000_000);
