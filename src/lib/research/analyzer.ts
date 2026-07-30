import type { DeepDiveResult } from "./types";
import { getOpenAI } from "@/lib/ai/client";

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

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("GPT-4o no devolvió contenido");
  }

  const parsed = JSON.parse(content) as DeepDiveResult["analysis"];

  return {
    asin: input.asin,
    analysis: parsed,
  };
}
