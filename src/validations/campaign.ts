import { z } from "zod";

export const campaignSchema = z.object({
  campaign_name: z.string().min(1, "El nombre es obligatorio").max(200, "M\u00E1ximo 200 caracteres"),
  campaign_type: z.enum(["sp_auto", "sp_manual_keyword", "sp_manual_product", "sb", "sd"]).default("sp_auto"),
  marketplace: z.string().max(10).default("US"),
  status: z.enum(["enabled", "paused", "archived"]).default("enabled"),
  daily_budget: z.coerce.number().min(0, "El budget no puede ser negativo").default(0),
});

export type CampaignFormData = z.infer<typeof campaignSchema>;
