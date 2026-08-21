import { z } from "zod";
import { getXAIClient } from "@/lib/ai/client";
import type { CapturedProduct } from "@/lib/research/types";

const grokGroupSchema = z.object({
  group_name: z.string().min(1),
  niche: z.string().nullable().optional(),
  amazon_category: z.string().nullable().optional(),
  match: z.enum(["existing", "new"]),
  group_id: z.string().nullable().optional(),
});

export async function classifyWithGrok(product: CapturedProduct) {
  const client = getXAIClient();
  if (!client) throw new Error("XAI no configurado");
  const completion = await client.chat.completions.create({
    model: "grok-4.5",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Sos un analista de productos Amazon FBA. Respondé JSON exacto." },
      { role: "user", content: `Clasificá este producto en un grupo por item. JSON: {group_name, niche, amazon_category, match, group_id}. Producto: ${JSON.stringify({ asin: product.asin, title: product.title, category: product.category, search_keyword: null })}` },
    ],
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("respuesta vacia");
  return grokGroupSchema.parse(JSON.parse(raw));
}
