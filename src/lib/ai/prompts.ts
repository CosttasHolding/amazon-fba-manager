import type { ListingData } from "./types";

export function buildAnalyzeProductPrompt(listing: ListingData): string {
  return `
Eres un experto en vender productos en Amazon FBA. Analiza el siguiente producto y proporciona un analisis completo en formato JSON.

DATOS DEL PRODUCTO (obtenidos de Amazon):
- Titulo: ${listing.title}
- Precio: ${listing.price ?? "N/A"} ${listing.currency}
- Categoria: ${listing.category}
- Bullet Points: ${listing.bulletPoints?.join(", ")}
- Marca: ${listing.brand}
- ASIN: ${listing.asin}

DEVUELVE UN JSON CON EXACTAMENTE ESTA ESTRUCTURA:
{
  "name": "nombre del producto (max 200 chars)",
  "niche": "nicho especifico al que pertenece",
  "amazon_category": "categoria principal de Amazon",
  "estimated_monthly_sales": numero estimado de ventas mensuales,
  "average_price": precio promedio del mercado,
  "review_count_competitor": estimacion de reviews del top competitor,
  "average_rating": rating promedio estimado (0.00-5.00),
  "bsr": best seller rank estimado,
  "competition_level": "low" | "medium" | "high",
  "estimated_cogs": costo estimado de bienes (40-60% del precio),
  "estimated_selling_price": precio sugerido de venta,
  "estimated_roi": ROI estimado como porcentaje,
  "differentiation_notes": "como diferenciarse de la competencia",
  "keywords": ["palabra", "clave", "1", "2", "3"],
  "notes": "analisis detallado del mercado y oportunidad"
}

REGLAS:
- Si no puedes estimar un campo, pon null
- Las ventas mensuales estimadas deben ser realistas (100-10000)
- El ROI debe ser realista para FBA (15-50% tipico)
- El COGS tipicamente es 30-60% del precio de venta
- Competition level basado en: reviews altos + muchas marcas = high
- Keywords deben ser relevantes para PPC
- Todas las respuestas en espanol

Responde SOLO con el JSON, sin texto adicional.
`;
}
