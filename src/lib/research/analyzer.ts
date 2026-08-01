import { z } from "zod";
import type { DeepDiveResult } from "./types";
import { getXAIClient } from "@/lib/ai/client";

const deepDiveAnalysisSchema = z.object({
  summary: z.string().catch(""),
  pain_points: z.array(z.string()).catch([]),
  differentiation_opportunities: z.array(z.string()).catch([]),
  market_fit: z.enum(["high", "medium", "low"]).catch("medium"),
  market_fit_reason: z.string().catch(""),
  risk_factors: z.array(z.string()).catch([]),
  recommended_actions: z.array(z.string()).catch([]),
  estimated_difficulty: z.enum(["easy", "moderate", "hard"]).catch("moderate"),
});

interface DeepDiveInput {
  asin: string;
  title: string;
  price: number | null;
  bsr: number | null;
  review_count: number | null;
  average_rating: number | null;
  estimated_monthly_sales: number | null;
  category: string | null;
  brand: string | null;
}

function buildDeepDivePrompt(input: DeepDiveInput): string {
  return `Analizá este producto de Amazon para determinar si es un buen producto para vender como negocio FBA (Fulfillment by Amazon).

Producto: ${input.title}
ASIN: ${input.asin}
Precio: ${input.price ? `$${input.price}` : "N/A"}
BSR: ${input.bsr ? `#${input.bsr}` : "N/A"}
Reviews: ${input.review_count ?? "N/A"} (Rating: ${input.average_rating ?? "N/A"})
Ventas estimadas/mes: ${input.estimated_monthly_sales?.toLocaleString() ?? "N/A"}
Categoría: ${input.category ?? "N/A"}
Marca: ${input.brand ?? "N/A"}

Respondé en formato JSON con esta estructura exacta (sin markdown, solo JSON):
{
  "summary": "resumen de una línea del potencial del producto",
  "pain_points": ["array de dolores comunes que mencionan los reviews"],
  "differentiation_opportunities": ["oportunidades de diferenciación"],
  "market_fit": "high|medium|low",
  "market_fit_reason": "por qué encaja en el mercado",
  "risk_factors": ["factores de riesgo"],
  "recommended_actions": ["acciones recomendadas"],
  "estimated_difficulty": "easy|moderate|hard"
}

Enfocate en datos, no generalidades. Si no hay datos suficientes, sé conservador.`;
}

export async function analyzeProductDeep(input: DeepDiveInput): Promise<DeepDiveResult> {
  const prompt = buildDeepDivePrompt(input);

  const completion = await getXAIClient().chat.completions.create({
    model: "grok-4.5",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("GPT-4o no devolvió contenido");
  }

  const parsed = deepDiveAnalysisSchema.parse(JSON.parse(content));

  return {
    asin: input.asin,
    analysis: parsed,
  };
}
